
import Skills from '../models/Skills.js';
import BusinessName from '../models/BusinessName.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import UserReview from '../models/UserReview.js';
import Inquiry from '../models/Inquiry.js';
import Document from '../models/Document.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import JobEnquiry from '../models/JobEnquiry.js';
import MobileBanner from '../models/MobileBanner.js';

const formatMobileBanner = (banner) => ({
  ...banner,
  createdByName: banner.createdBy?.fullName || null,
  updatedByName: banner.updatedBy?.fullName || null,
});

const hasAdminAccess = (req) => {
  const userType = req.user?.userType;
  return userType === 'admin' || userType === 'super_admin';
};


export const getSkills = async (req, res) => {
  try {
    const requestedFlag = String(req.query.flag || '').trim().toLowerCase();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 20;

    const langMap = {
      hi: 'hi',
      hindi: 'hi',
      en: 'en',
      eng: 'en',
      english: 'en',
      mr: 'mr',
      marathi: 'mr',
    };

    const selectedLang = langMap[requestedFlag] || 'en';

    const nameFieldByLang = {
      en: 'enName',
      hi: 'hiName',
      mr: 'mrName',
    };

    const selectedNameField = nameFieldByLang[selectedLang] || 'enName';

    const totalSkills = await Skills.countDocuments({});
    const totalPages = Math.max(Math.ceil(totalSkills / limit), 1);
    const skip = (page - 1) * limit;

    const skills = await Skills.find({}, { _id: 0, enName: 1, hiName: 1, mrName: 1, name: 1 })
      .sort({ enName: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const listedSkills = skills
      .map((skill) => {
        const selectedName = (skill[selectedNameField] || '').trim();
        const fallbackName =
          (skill.enName || '').trim() ||
          (skill.name || '').trim() ||
          (skill.hiName || '').trim() ||
          (skill.mrName || '').trim();

        return selectedName || fallbackName;
      })
      .filter(Boolean);

    res.json({
      success: true,
      lang: selectedLang,
      page,
      perPage: limit,
      totalSkills,
      totalPages,
      skills: listedSkills,
    });
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).json({ success: false, message: "Failed to fetch skills" });
  }
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSkillPageQuery = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();

  const filter = {};
  if (category) {
    filter.category = category;
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ enName: regex }, { name: regex }, { hiName: regex }, { mrName: regex }];
  }

  return { page, limit, filter };
};

const buildPagination = (page, limit, total) => {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

// Public (customer app, labour app): paginated skills with all three languages.
// Query: page, limit (max 100), search, category, lang (en|hi|mr)
export const listSkillsPaginated = async (req, res) => {
  try {
    const { page, limit, filter } = buildSkillPageQuery(req);
    const langMap = { hi: 'hiName', hindi: 'hiName', mr: 'mrName', marathi: 'mrName' };
    const requestedLang = String(req.query.lang || req.query.flag || 'en').trim().toLowerCase();
    const nameField = langMap[requestedLang] || 'enName';
    const lang = nameField === 'hiName' ? 'hi' : nameField === 'mrName' ? 'mr' : 'en';

    const [total, skills] = await Promise.all([
      Skills.countDocuments(filter),
      Skills.find(filter, { enName: 1, hiName: 1, mrName: 1, name: 1, category: 1 })
        .sort({ enName: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const items = skills.map((skill) => {
      const enName = skill.enName || skill.name || '';
      return {
        id: skill._id,
        name: (skill[nameField] || '').trim() || enName,
        enName,
        hiName: skill.hiName || '',
        mrName: skill.mrName || '',
        category: skill.category || '',
      };
    });

    res.json({ success: true, lang, ...buildPagination(page, limit, total), skills: items });
  } catch (error) {
    console.error('Error listing skills:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch skills' });
  }
};

// Public: distinct skill categories with skill counts.
export const listSkillCategories = async (req, res) => {
  try {
    const rows = await Skills.aggregate([
      { $match: { category: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({
      success: true,
      total: rows.length,
      categories: rows.map((row) => ({ category: row._id, count: row.count })),
    });
  } catch (error) {
    console.error('Error listing skill categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch skill categories' });
  }
};

// Admin portal: paginated full skill records.
// Query: page, limit (max 100), search, category
export const adminListSkillsPaginated = async (req, res) => {
  try {
    const { page, limit, filter } = buildSkillPageQuery(req);

    const [total, skills] = await Promise.all([
      Skills.countDocuments(filter),
      Skills.find(filter)
        .sort({ enName: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'fullName')
        .populate('updatedBy', 'fullName')
        .lean(),
    ]);

    res.json({
      success: true,
      ...buildPagination(page, limit, total),
      skills: skills.map((skill) => ({
        ...skill,
        createdByName: skill.createdBy?.fullName || null,
        updatedByName: skill.updatedBy?.fullName || null,
      })),
    });
  } catch (error) {
    console.error('Error listing skills for admin:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch skills' });
  }
};

export const getAllSkills = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const totalSkills = await Skills.countDocuments({});
    const totalPages = Math.max(Math.ceil(totalSkills / limit), 1);
    const skills = await Skills.find({})
      .sort({ enName: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName')
      .lean();

    const formattedSkills = skills.map((skill) => ({
      ...skill,
      createdByName: skill.createdBy?.fullName || null,
      updatedByName: skill.updatedBy?.fullName || null,
    }));

    res.json({
      success: true,
      page,
      perPage: limit,
      totalSkills,
      totalPages,
      skills: formattedSkills,
    });
  } catch (error) {
    console.error("Error fetching skills:", error);
    res.status(500).json({ success: false, message: "Failed to fetch skills" });
  }
};
export const addSkills = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, enName, hiName, mrName, description, category } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const normalizedEnName = String(enName || name || '').trim();
    const normalizedHiName = String(hiName || '').trim();
    const normalizedMrName = String(mrName || '').trim();

    if (!normalizedEnName) {
      return res.status(400).json({ success: false, message: 'enName is required' });
    }

    const newSkill = new Skills({
      enName: normalizedEnName,
      hiName: normalizedHiName,
      mrName: normalizedMrName,
      name: normalizedEnName,
      description,
      category,
      lang: ['hi', 'en', 'mr'],
      createdBy: userId,
      updatedBy: userId,
    });
    await newSkill.save();

    res.json({ success: true, message: "Skill added successfully" });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Skill already exists" });
    }

    console.error("Error adding skill:", error);
    res.status(500).json({ success: false, message: "Failed to add skill" });
  }
};

export const getAllSkillsName = async (req, res) => {
  try {
    const skills = await Skills.find({}, { _id: 1, enName: 1, hiName: 1, mrName: 1, name: 1 })
      .sort({ enName: 1, name: 1 })
      .lean();

    const skillNames = skills.map((skill) => ({
      id: skill._id,
      enName: skill.enName || skill.name || '',
      hiName: skill.hiName || '',
      mrName: skill.mrName || '',
    }));

    res.json({
      success: true,
      total: skillNames.length,
      skills: skillNames,
    });
  } catch (error) {
    console.error('Error fetching all skill names:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch skill names' });
  }
};

export const updateSkill = async (req, res) => {
  try {
    const userId = req.userId;
    const { skillId } = req.params;
    const { name, enName, hiName, mrName, description, category } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!skillId) {
      return res.status(400).json({ success: false, message: 'skillId is required' });
    }

    const existingSkill = await Skills.findById(skillId);

    if (!existingSkill) {
      return res.status(404).json({ success: false, message: 'Skill not found' });
    }

    const normalizedEnName =
      enName !== undefined
        ? String(enName || '').trim()
        : name !== undefined
          ? String(name || '').trim()
          : undefined;

    if (normalizedEnName !== undefined && !normalizedEnName) {
      return res.status(400).json({ success: false, message: 'enName cannot be empty' });
    }

    const updatePayload = {
      updatedBy: userId,
    };

    if (normalizedEnName !== undefined) {
      updatePayload.enName = normalizedEnName;
      updatePayload.name = normalizedEnName;
    }

    if (hiName !== undefined) {
      updatePayload.hiName = String(hiName || '').trim();
    }

    if (mrName !== undefined) {
      updatePayload.mrName = String(mrName || '').trim();
    }

    if (description !== undefined) {
      updatePayload.description = String(description || '').trim();
    }

    if (category !== undefined) {
      updatePayload.category = String(category || '').trim();
    }

    const updatedSkill = await Skills.findByIdAndUpdate(skillId, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName')
      .lean();

    return res.json({
      success: true,
      message: 'Skill updated successfully',
      skill: {
        ...updatedSkill,
        createdByName: updatedSkill.createdBy?.fullName || null,
        updatedByName: updatedSkill.updatedBy?.fullName || null,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Skill already exists' });
    }

    console.error('Error updating skill:', error);
    return res.status(500).json({ success: false, message: 'Failed to update skill' });
  }
};

export const getAllBusinessName = async (req, res) => {
  try {
    const businesses = await BusinessName.find({}, { _id: 1, enName: 1, hiName: 1, mrName: 1, name: 1, category: 1 })
      .sort({ enName: 1, name: 1 })
      .lean();

    const businessNames = businesses.map((b) => ({
      id: b._id,
      enName: b.enName || b.name || '',
      hiName: b.hiName || '',
      mrName: b.mrName || '',
      category: b.category || '',
    }));

    res.json({
      success: true,
      total: businessNames.length,
      businesses: businessNames,
    });
  } catch (error) {
    console.error('Error fetching all business names:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch business names' });
  }
};

export const addBusinessName = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const items = Array.isArray(req.body) ? req.body : [req.body];

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Request body cannot be empty' });
    }

    // Validate all items first
    for (let i = 0; i < items.length; i++) {
      const { enName, name } = items[i];
      const normalizedEnName = String(enName || name || '').trim();
      if (!normalizedEnName) {
        return res.status(400).json({
          success: false,
          message: `enName is required at index ${i}`,
        });
      }
    }

    const docs = items.map(({ enName, hiName, mrName, name, description, category }) => {
      const normalizedEnName = String(enName || name || '').trim();
      return {
        enName: normalizedEnName,
        hiName: String(hiName || '').trim(),
        mrName: String(mrName || '').trim(),
        name: normalizedEnName,
        description,
        category,
        lang: ['hi', 'en', 'mr'],
        createdBy: userId,
        updatedBy: userId,
      };
    });

    const result = await BusinessName.insertMany(docs, { ordered: false });

    res.json({
      success: true,
      message: `${result.length} business name(s) added successfully`,
      inserted: result.length,
    });
  } catch (error) {
    if (error?.code === 11000 || error?.name === 'MongoBulkWriteError') {
      const inserted = error?.result?.nInserted ?? 0;
      const duplicates = (error?.writeErrors || []).map((e) => e?.err?.op?.enName).filter(Boolean);
      return res.status(409).json({
        success: false,
        message: 'Some business names already exist',
        inserted,
        duplicates,
      });
    }
    console.error('Error adding business name:', error);
    res.status(500).json({ success: false, message: 'Failed to add business name' });
  }
};

export const updateBusinessName = async (req, res) => {
  try {
    const userId = req.userId;
    const { businessId } = req.params;
    const { enName, hiName, mrName, name, description, category } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!businessId) {
      return res.status(400).json({ success: false, message: 'businessId is required' });
    }

    const existingBusiness = await BusinessName.findById(businessId);
    if (!existingBusiness) {
      return res.status(404).json({ success: false, message: 'Business name not found' });
    }

    const normalizedEnName =
      enName !== undefined
        ? String(enName || '').trim()
        : name !== undefined
          ? String(name || '').trim()
          : undefined;

    if (normalizedEnName !== undefined && !normalizedEnName) {
      return res.status(400).json({ success: false, message: 'enName cannot be empty' });
    }

    const updatePayload = { updatedBy: userId };

    if (normalizedEnName !== undefined) {
      updatePayload.enName = normalizedEnName;
      updatePayload.name = normalizedEnName;
    }
    if (hiName !== undefined) updatePayload.hiName = String(hiName || '').trim();
    if (mrName !== undefined) updatePayload.mrName = String(mrName || '').trim();
    if (description !== undefined) updatePayload.description = String(description || '').trim();
    if (category !== undefined) updatePayload.category = String(category || '').trim();

    const updatedBusiness = await BusinessName.findByIdAndUpdate(businessId, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName')
      .lean();

    return res.json({
      success: true,
      message: 'Business name updated successfully',
      business: {
        ...updatedBusiness,
        createdByName: updatedBusiness.createdBy?.fullName || null,
        updatedByName: updatedBusiness.updatedBy?.fullName || null,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Business name already exists' });
    }
    console.error('Error updating business name:', error);
    return res.status(500).json({ success: false, message: 'Failed to update business name' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalLabours,
      totalContractors,
      totalSubContractors,
      totalJobs,
      openJobs,
      inProgressJobs,
      completedJobs,
      totalReviews,
      totalSkills,
      totalInquiries,
      totalDocuments,
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalNotifications,
      totalJobEnquiries,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ userType: 'labour' }),
      User.countDocuments({ userType: 'contractor' }),
      User.countDocuments({ userType: 'sub_contractor' }),
      Job.countDocuments({}),
      Job.countDocuments({ status: 'open' }),
      Job.countDocuments({ status: 'in_progress' }),
      Job.countDocuments({ status: 'completed' }),
      UserReview.countDocuments({}),
      Skills.countDocuments({}),
      Inquiry.countDocuments({}),
      Document.countDocuments({}),
      Payment.countDocuments({}),
      Payment.countDocuments({ status: 'success' }),
      Payment.countDocuments({ status: 'failed' }),
      Payment.countDocuments({ status: 'pending' }),
      Notification.countDocuments({}),
      JobEnquiry.countDocuments({}),
    ]);

    return res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          labour: totalLabours,
          contractor: totalContractors,
          subContractor: totalSubContractors,
        },
        jobs: {
          total: totalJobs,
          open: openJobs,
          inProgress: inProgressJobs,
          completed: completedJobs,
        },
        reviews: totalReviews,
        skills: totalSkills,
        inquiries: totalInquiries,
        documents: totalDocuments,
        payments: {
          total: totalPayments,
          successful: successfulPayments,
          failed: failedPayments,
          pending: pendingPayments,
        },
        notifications: totalNotifications,
        jobEnquiries: totalJobEnquiries,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};

export const createMobileBanner = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, bannerImageUrl, link, context, visible } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!hasAdminAccess(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const normalizedTitle = String(title || '').trim();
    const normalizedBannerImageUrl = String(bannerImageUrl || '').trim();
    const normalizedLink = String(link || '').trim();
    const normalizedContext = String(context || '').trim();

    if (!normalizedTitle) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    if (!normalizedBannerImageUrl) {
      return res.status(400).json({ success: false, message: 'bannerImageUrl is required' });
    }

    if (!normalizedLink) {
      return res.status(400).json({ success: false, message: 'link is required' });
    }

    const mobileBanner = new MobileBanner({
      title: normalizedTitle,
      bannerImageUrl: normalizedBannerImageUrl,
      link: normalizedLink,
      context: normalizedContext,
      visible: visible === true || visible === 'true' || visible === 1 || visible === '1',
      createdBy: userId,
      updatedBy: userId,
    });

    await mobileBanner.save();

    if (mobileBanner.visible) {
      await MobileBanner.updateMany(
        { _id: { $ne: mobileBanner._id } },
        { $set: { visible: false } },
      );
    }

    const savedBanner = await MobileBanner.findById(mobileBanner._id)
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Mobile banner created successfully',
      banner: formatMobileBanner(savedBanner),
    });
  } catch (error) {
    console.error('Error creating mobile banner:', error);
    return res.status(500).json({ success: false, message: 'Failed to create mobile banner' });
  }
};

export const updateMobileBanner = async (req, res) => {
  try {
    const userId = req.userId;
    const { bannerId } = req.params;
    const { title, bannerImageUrl, link, context, visible } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!hasAdminAccess(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    if (!bannerId) {
      return res.status(400).json({ success: false, message: 'bannerId is required' });
    }

    const existingBanner = await MobileBanner.findById(bannerId);
    if (!existingBanner) {
      return res.status(404).json({ success: false, message: 'Mobile banner not found' });
    }

    const updatePayload = { updatedBy: userId };

    if (title !== undefined) {
      const normalizedTitle = String(title || '').trim();
      if (!normalizedTitle) {
        return res.status(400).json({ success: false, message: 'title cannot be empty' });
      }
      updatePayload.title = normalizedTitle;
    }

    if (bannerImageUrl !== undefined) {
      const normalizedBannerImageUrl = String(bannerImageUrl || '').trim();
      if (!normalizedBannerImageUrl) {
        return res.status(400).json({ success: false, message: 'bannerImageUrl cannot be empty' });
      }
      updatePayload.bannerImageUrl = normalizedBannerImageUrl;
    }

    if (link !== undefined) {
      const normalizedLink = String(link || '').trim();
      if (!normalizedLink) {
        return res.status(400).json({ success: false, message: 'link cannot be empty' });
      }
      updatePayload.link = normalizedLink;
    }

    if (context !== undefined) {
      updatePayload.context = String(context || '').trim();
    }

    if (visible !== undefined) {
      updatePayload.visible = visible === true || visible === 'true' || visible === 1 || visible === '1';
    }

    const updatedBanner = await MobileBanner.findByIdAndUpdate(bannerId, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName')
      .lean();

    if (updatedBanner.visible) {
      await MobileBanner.updateMany(
        { _id: { $ne: updatedBanner._id } },
        { $set: { visible: false } },
      );
    }

    return res.json({
      success: true,
      message: 'Mobile banner updated successfully',
      banner: formatMobileBanner(updatedBanner),
    });
  } catch (error) {
    console.error('Error updating mobile banner:', error);
    return res.status(500).json({ success: false, message: 'Failed to update mobile banner' });
  }
};

export const getActiveMobileBanner = async (req, res) => {
  try {
    const banner = await MobileBanner.findOne({ visible: true })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      banner: banner || null,
      hasBanner: Boolean(banner),
    });
  } catch (error) {
    console.error('Error fetching active mobile banner:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch active mobile banner' });
  }
};

export const getAllMobileBanners = async (req, res) => {
  try {
    const banners = await MobileBanner.find({})
      .sort({ visible: -1, updatedAt: -1, createdAt: -1 })
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName')
      .lean();

    return res.json({
      success: true,
      total: banners.length,
      banners: banners.map(formatMobileBanner),
    });
  } catch (error) {
    console.error('Error fetching mobile banners:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch mobile banners' });
  }
};

export const deleteMobileBanner = async (req, res) => {
  try {
    const userId = req.userId;
    const { bannerId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!hasAdminAccess(req)) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    if (!bannerId) {
      return res.status(400).json({ success: false, message: 'bannerId is required' });
    }

    const deletedBanner = await MobileBanner.findByIdAndDelete(bannerId).lean();

    if (!deletedBanner) {
      return res.status(404).json({ success: false, message: 'Mobile banner not found' });
    }

    return res.json({
      success: true,
      message: 'Mobile banner deleted successfully',
      deletedBanner,
    });
  } catch (error) {
    console.error('Error deleting mobile banner:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete mobile banner' });
  }
};