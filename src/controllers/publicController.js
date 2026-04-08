
import Skills from '../models/Skills.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import UserReview from '../models/UserReview.js';
import Inquiry from '../models/Inquiry.js';
import Document from '../models/Document.js';
import Notification from '../models/Notification.js';
import JobEnquiry from '../models/JobEnquiry.js';


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
        notifications: totalNotifications,
        jobEnquiries: totalJobEnquiries,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};