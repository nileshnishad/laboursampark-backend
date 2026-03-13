import ActivityHistory from "../models/ActivityHistory.js";

/**
 * Log user activity to history
 * @param {string} userId - User ID
 * @param {string} activityType - Type of activity
 * @param {string} relatedId - Related entity ID
 * @param {string} relatedModel - Related model name
 * @param {string} description - Description
 * @param {object} details - Additional details
 * @param {object} req - Express request object (for IP and user agent)
 */
export const logActivity = async (
  userId,
  activityType,
  relatedId = null,
  relatedModel = null,
  description = "",
  details = {},
  req = null
) => {
  try {
    // Safely extract IP address
    let ipAddress = null;
    try {
      if (req && req.ip) {
        ipAddress = req.ip;
      } else if (req && req.connection && req.connection.remoteAddress) {
        ipAddress = req.connection.remoteAddress;
      }
    } catch (e) {
      ipAddress = null;
    }

    // Safely extract user agent
    let userAgent = null;
    try {
      if (req && typeof req.get === 'function') {
        userAgent = req.get("user-agent");
      }
    } catch (e) {
      userAgent = null;
    }

    const activity = new ActivityHistory({
      userId,
      activityType,
      relatedId,
      relatedModel,
      description,
      details,
      ipAddress,
      userAgent,
      status: "success",
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw - just log the error silently
    return null;
  }
};

/**
 * Log failed activity
 */
export const logFailedActivity = async (
  userId,
  activityType,
  description = "",
  errorMessage = "",
  req = null
) => {
  try {
    const activity = new ActivityHistory({
      userId,
      activityType,
      description,
      status: "failed",
      errorMessage,
      ipAddress: req ? req.ip || req.connection.remoteAddress : null,
      userAgent: req ? req.get("user-agent") : null,
    });

    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging failed activity:", error);
    return null;
  }
};
