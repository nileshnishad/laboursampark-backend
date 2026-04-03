
import Skills from '../models/Skills.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import UserReview from '../models/UserReview.js';
import Inquiry from '../models/Inquiry.js';
import Document from '../models/Document.js';
import Payment from '../models/Payment.js';
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

    const languageFilter =
      selectedLang === 'en'
        ? {
            $or: [
              { lang: 'en' },
              { lang: { $exists: false } },
              { lang: { $size: 0 } },
            ],
          }
        : { lang: selectedLang };

    const totalSkills = await Skills.countDocuments(languageFilter);
    const totalPages = Math.max(Math.ceil(totalSkills / limit), 1);
    const skip = (page - 1) * limit;

    const skills = await Skills.find(languageFilter, { _id: 0, name: 1 })
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const listedSkills = skills.map((skill) => skill.name);

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
      .sort({ name: 1 })
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
    const { name, description, category, lang } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!name || !lang) {
      return res.status(400).json({ success: false, message: "Name and language are required" });
    }

    const normalizedLang = Array.isArray(lang) ? lang : [lang];

    const newSkill = new Skills({
      name,
      description,
      category,
      lang: normalizedLang,
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