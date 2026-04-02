
import Skills from '../models/Skills.js';


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