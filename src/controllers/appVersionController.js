import AppVersion from '../models/AppVersion.js';

export const compareVersions = (currentVersion, targetVersion) => {
  const parseVersion = (value) => {
    if (!value) return [0];
    return String(value)
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);
  };

  const current = parseVersion(currentVersion);
  const target = parseVersion(targetVersion);

  for (let i = 0; i < Math.max(current.length, target.length); i += 1) {
    const a = current[i] || 0;
    const b = target[i] || 0;
    if (a < b) return true;
    if (a > b) return false;
  }

  return false;
};

export const getVersionUpdateDecision = (appVersion, minimumVersion, latestVersion, forceUpdateFlag = false) => {
  const needsUpdate = compareVersions(appVersion, latestVersion);
  const forceUpdate = forceUpdateFlag || compareVersions(appVersion, minimumVersion);

  return {
    needsUpdate,
    forceUpdate,
    message: needsUpdate ? 'A newer version is available.' : 'You are on the latest version.',
  };
};

export const checkAppVersion = async (req, res) => {
  try {
    const { platform, appVersion, buildNumber } = req.body;

    if (!platform || !appVersion) {
      return res.status(400).json({
        success: false,
        message: 'platform and appVersion are required',
      });
    }

    const normalizedPlatform = String(platform).toLowerCase();
    if (!['ios', 'android'].includes(normalizedPlatform)) {
      return res.status(400).json({
        success: false,
        message: 'platform must be ios or android',
      });
    }

    const versionDoc = await AppVersion.findOne({
      platform: normalizedPlatform,
      isActive: true,
    }).sort({ createdAt: -1 }).lean();

    const fallbackLatestVersion = '1.0.17';
    const fallbackMinimumVersion = '1.0.16';
    const fallbackStoreUrls = {
      android: 'https://play.google.com/store/apps/details?id=com.laboursampark.app',
      ios: 'https://apps.apple.com/app/id6797599845',
    };

    const latestVersion = versionDoc?.latestVersion || fallbackLatestVersion;
    const minimumVersion = versionDoc?.minimumVersion || fallbackMinimumVersion;
    const forceUpdateFlag = versionDoc?.forceUpdate ?? false;
    const storeUrl = versionDoc?.storeUrl || fallbackStoreUrls[normalizedPlatform] || fallbackStoreUrls.ios;
    const message = versionDoc?.message || 'Update available';

    const decision = getVersionUpdateDecision(appVersion, minimumVersion, latestVersion, forceUpdateFlag);

    return res.json({
      success: true,
      data: {
        latestVersion,
        minimumVersion,
        forceUpdate: decision.forceUpdate,
        androidStoreUrl: fallbackStoreUrls.android,
        iosStoreUrl: fallbackStoreUrls.ios,
        message: decision.needsUpdate ? (message || 'A newer version is available.') : 'You are on the latest version.',
        buildNumber: buildNumber || null,
        platform: normalizedPlatform,
      },
      meta: {
        source: versionDoc ? 'database' : 'fallback',
      },
    });
  } catch (error) {
    console.error('App version check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check app version',
    });
  }
};

export const createOrUpdateAppVersion = async (req, res) => {
  try {
    const { platform, latestVersion, minimumVersion, forceUpdate, message, storeUrl } = req.body;

    if (!platform || !latestVersion || !minimumVersion) {
      return res.status(400).json({
        success: false,
        message: 'platform, latestVersion and minimumVersion are required',
      });
    }

    const normalizedPlatform = String(platform).toLowerCase();
    if (!['ios', 'android'].includes(normalizedPlatform)) {
      return res.status(400).json({
        success: false,
        message: 'platform must be ios or android',
      });
    }

    const doc = await AppVersion.findOneAndUpdate(
      { platform: normalizedPlatform },
      {
        platform: normalizedPlatform,
        latestVersion,
        minimumVersion,
        forceUpdate: Boolean(forceUpdate),
        message: message || 'A newer version is available.',
        storeUrl: storeUrl || undefined,
        isActive: true,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: 'App version config updated successfully',
      data: doc,
    });
  } catch (error) {
    console.error('Create/update app version error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update app version config',
    });
  }
};
