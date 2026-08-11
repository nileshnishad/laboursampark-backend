import User from '../models/User.js';
import Notification from '../models/Notification.js';
import admin from 'firebase-admin';

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    return null;
  }

  try {
    const parsedAccount = JSON.parse(serviceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(parsedAccount),
    });
    return admin.app();
  } catch (error) {
    console.error('Firebase init error:', error);
    return null;
  }
};

const getFirebaseMessaging = () => {
  const app = initializeFirebase();
  return app ? admin.messaging(app) : null;
};

export const normalizeTargetValues = (values) => {
  if (!values) {
    return [];
  }

  const items = Array.isArray(values) ? values : [values];

  return items
    .filter(Boolean)
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return normalizeTargetValues(value);
      }

      if (typeof value === 'object') {
        if (value instanceof String) {
          return [value.toString()];
        }

        if (value && value._id) {
          return [String(value._id)];
        }

        return [String(value)];
      }

      return [String(value)];
    });
};

const buildTargetQuery = (reqBody) => {
  const { userType, skills, businessTypes, skillIds, businessTypeIds, userIds, excludeUserIds } = reqBody;
  const query = {};

  if (userType) {
    query.userType = userType;
  }

  const normalizedSkillIds = normalizeTargetValues(skillIds || skills);
  const normalizedBusinessTypeIds = normalizeTargetValues(businessTypeIds || businessTypes);

  if (normalizedSkillIds.length > 0) {
    query.skills = { $in: normalizedSkillIds };
  }

  if (normalizedBusinessTypeIds.length > 0) {
    query.businessTypes = { $in: normalizedBusinessTypeIds };
  }

  if (userIds && userIds.length > 0) {
    query._id = { $in: userIds };
  }

  if (excludeUserIds && excludeUserIds.length > 0) {
    query._id = { ...(query._id || {}), $nin: excludeUserIds };
  }

  return query;
};

const getUserDeviceTokens = async (query) => {
  const users = await User.find(query).select('_id deviceTokens userType fullName email').lean();
  return users.filter((user) => Array.isArray(user.deviceTokens) && user.deviceTokens.length > 0);
};

const createNotifications = async ({ title, message, recipients, payload = {}, notificationType = 'general', priority = 'high' }) => {
  const docs = recipients.map((recipient) => ({
    userId: recipient.userId,
    notificationType,
    title,
    message,
    details: payload.details || {},
    priority,
    actionRequired: Boolean(payload.actionRequired),
  }));

  return Notification.insertMany(docs);
};

export const sendFCMNotification = async (req, res) => {
  try {
    const { title, message, userType, skills, businessTypes, skillIds, businessTypeIds, userIds, excludeUserIds, data = {}, notificationType = 'general', priority = 'high' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    const query = buildTargetQuery({ userType, skills, businessTypes, skillIds, businessTypeIds, userIds, excludeUserIds });
    const recipients = await getUserDeviceTokens(query);

    if (!recipients.length) {
      return res.status(404).json({ success: false, message: 'No users found for the provided targeting criteria' });
    }

    const tokens = recipients.flatMap((user) => user.deviceTokens || []);
    const messaging = getFirebaseMessaging();

    const payloadData = {
      title,
      body: message,
      type: notificationType,
      ...data,
    };

    const fcmPayload = {
      notification: {
        title,
        body: message,
      },
      data: payloadData,
      tokens,
    };

    let result;
    if (messaging) {
      result = await messaging.sendEachForMulticast(fcmPayload);
    } else {
      result = { successCount: 0, failureCount: tokens.length, responses: tokens.map(() => ({ error: 'Firebase not configured' })) };
    }

    const failedResponses = (result?.responses || []).filter((response) => !response?.success).map((response, index) => ({
      index,
      error: response?.error?.message || response?.error || 'Unknown FCM error',
      success: response?.success || false,
    }));

    await createNotifications({
      title,
      message,
      recipients: recipients.map((user) => ({ userId: user._id })),
      payload: data,
      notificationType,
      priority,
    });

    return res.json({
      success: true,
      message: 'FCM notification sent successfully',
      data: {
        totalTargets: recipients.length,
        totalTokens: tokens.length,
        successCount: result?.successCount || 0,
        failureCount: result?.failureCount || 0,
        responses: result?.responses || [],
        failedResponses,
      },
    });
  } catch (error) {
    console.error('Send FCM notification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send FCM notification', error: error.message });
  }
};

export const sendFCMToUser = async (req, res) => {
  try {
    const { userId, title, message, data = {}, notificationType = 'general', priority = 'high' } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ success: false, message: 'userId, title and message are required' });
    }

    const user = await User.findById(userId).select('_id deviceTokens').lean();
    if (!user || !Array.isArray(user.deviceTokens) || user.deviceTokens.length === 0) {
      return res.status(404).json({ success: false, message: 'No FCM token found for the selected user' });
    }

    const messaging = getFirebaseMessaging();
    const payloadData = {
      title,
      body: message,
      type: notificationType,
      ...data,
    };

    const fcmPayload = {
      notification: {
        title,
        body: message,
      },
      data: payloadData,
      tokens: user.deviceTokens,
    };

    let result;
    if (messaging) {
      result = await messaging.sendEachForMulticast(fcmPayload);
    } else {
      result = { successCount: 0, failureCount: user.deviceTokens.length, responses: user.deviceTokens.map(() => ({ error: 'Firebase not configured' })) };
    }

    const failedResponses = (result?.responses || []).filter((response) => !response?.success).map((response, index) => ({
      index,
      error: response?.error?.message || response?.error || 'Unknown FCM error',
      success: response?.success || false,
    }));

    await Notification.create({
      userId: user._id,
      notificationType,
      title,
      message,
      details: data.details || {},
      priority,
      actionRequired: Boolean(data.actionRequired),
    });

    return res.json({
      success: true,
      message: 'FCM notification sent to user successfully',
      data: {
        userId,
        successCount: result?.successCount || 0,
        failureCount: result?.failureCount || 0,
        failedResponses,
      },
    });
  } catch (error) {
    console.error('Send FCM to user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send FCM notification to user', error: error.message });
  }
};

export const getTokenUsers = async (req, res) => {
  try {
    const users = await User.find({ deviceTokens: { $exists: true, $not: { $size: 0 } } })
      .select('_id fullName email mobile deviceTokens userType')
      .lean();

    return res.json({
      success: true,
      data: {
        totalUsersWithTokens: users.length,
        users,
      },
    });
  } catch (error) {
    console.error('Get token users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch token users', error: error.message });
  }
};

export const getFCMStats = async (req, res) => {
  try {
    const totalUsersWithTokens = await User.countDocuments({ deviceTokens: { $exists: true, $not: { $size: 0 } } });
    const recentNotifications = await Notification.find({ notificationType: 'general' }).sort({ createdAt: -1 }).limit(10).lean();

    return res.json({
      success: true,
      data: {
        totalUsersWithTokens,
        recentNotifications,
      },
    });
  } catch (error) {
    console.error('Get FCM stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch FCM stats' });
  }
};
