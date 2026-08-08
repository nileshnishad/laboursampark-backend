import admin from 'firebase-admin';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

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
    console.error('Firebase init error for job notifications:', error);
    return null;
  }
};

const getFirebaseMessaging = () => {
  const app = initializeFirebase();
  return app ? admin.messaging(app) : null;
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && value._id) {
    return String(value._id).toLowerCase();
  }

  return String(value).trim().toLowerCase();
};

const normalizeValues = (values) => {
  if (!values) return [];
  const items = Array.isArray(values) ? values : [values];
  return items.filter(Boolean).map((value) => normalizeValue(value));
};

const matchesLocation = (jobLocation = {}, userLocation = {}) => {
  if (!jobLocation) return true;

  const locationFields = [
    ['city', jobLocation.city],
    ['state', jobLocation.state],
    ['area', jobLocation.area],
    ['pincode', jobLocation.pincode],
  ];

  const hasJobLocation = locationFields.some(([, value]) => Boolean(value));
  if (!hasJobLocation) {
    return true;
  }

  return locationFields.some(([, jobValue]) => {
    if (!jobValue) return false;
    const normalizedJobValue = normalizeValue(jobValue);
    if (!normalizedJobValue) return false;

    return [userLocation.city, userLocation.state, userLocation.area, userLocation.pincode].some((userValue) => normalizeValue(userValue) === normalizedJobValue);
  });
};

export const matchesJobAudience = (job, user) => {
  if (!user || !job) return false;

  if (!job.target || !job.target.includes(user.userType)) return false;

  if (!matchesLocation(job.location, user.location)) return false;

  if (user.userType === 'labour') {
    const jobSkills = normalizeValues(job.requiredSkills || []);
    if (jobSkills.length === 0) {
      return true;
    }

    const userSkills = normalizeValues(user.skills || []);
    return userSkills.some((skill) => jobSkills.includes(skill));
  }

  if (user.userType === 'contractor' || user.userType === 'sub_contractor') {
    const jobBusinessTypes = normalizeValues(job.businessTypes || []);
    if (jobBusinessTypes.length === 0) {
      return true;
    }

    const userBusinessTypes = normalizeValues(user.businessTypes || []);
    return userBusinessTypes.some((businessType) => jobBusinessTypes.includes(businessType));
  }

  return false;
};

const getNotificationContent = (job, creatorUser, targetUserType) => {
  const creatorName = creatorUser?.fullName || 'A contractor';
  const jobTitle = job?.workTitle || 'a new job';
  const locationText = [job?.location?.city, job?.location?.state].filter(Boolean).join(', ');

  if (targetUserType === 'labour') {
    return {
      title: 'New job matching your skills',
      message: `${creatorName} posted a new job matching your skills: ${jobTitle}${locationText ? ` in ${locationText}` : ''}`,
    };
  }

  return {
    title: 'New job available',
    message: `${creatorName} posted a new job for ${targetUserType === 'sub_contractor' ? 'sub-contractors' : 'professionals'}: ${jobTitle}${locationText ? ` in ${locationText}` : ''}`,
  };
};

export const sendJobCreatedNotifications = async (job, creatorUser) => {
  try {
    if (!job || !creatorUser) return { sent: 0, skipped: 0 };

    const candidateUsers = await User.find({
      status: 'active',
      userType: { $in: job.target || [] },
      _id: { $ne: creatorUser._id },
    }).select('_id fullName userType skills businessTypes location deviceTokens').lean();

    const matchingUsers = candidateUsers.filter((user) => matchesJobAudience(job, user));

    if (!matchingUsers.length) {
      return { sent: 0, skipped: 0 };
    }

    const messaging = getFirebaseMessaging();
    const notificationDocs = [];
    const notificationPayloads = [];

    for (const user of matchingUsers) {
      const { title, message } = getNotificationContent(job, creatorUser, user.userType);

      notificationDocs.push({
        userId: user._id,
        notificationType: 'job_created',
        title,
        message,
        details: {
          jobId: job._id,
          actionUrl: `/jobs/${job._id}`,
        },
        priority: 'high',
        actionRequired: false,
      });

      const tokens = Array.isArray(user.deviceTokens) ? user.deviceTokens.filter(Boolean) : [];
      if (tokens.length > 0) {
        notificationPayloads.push({
          token: tokens[0],
          title,
          body: message,
          data: {
            type: 'job_created',
            jobId: String(job._id),
            senderId: String(creatorUser._id),
          },
        });
      }
    }

    if (notificationDocs.length > 0) {
      await Notification.insertMany(notificationDocs);
    }

    if (messaging && notificationPayloads.length > 0) {
      const sendPromises = notificationPayloads.map((payload) =>
        messaging.send({
          token: payload.token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data,
        }).catch((error) => {
          console.error('FCM send failed for job notification:', error);
          return null;
        })
      );

      await Promise.all(sendPromises);
    }

    return {
      sent: notificationPayloads.length,
      skipped: matchingUsers.length - notificationPayloads.length,
    };
  } catch (error) {
    console.error('Job notification dispatch error:', error);
    return { sent: 0, skipped: 0 };
  }
};
