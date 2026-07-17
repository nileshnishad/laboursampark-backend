import  express from 'express';

import { getSkills, getAllSkills, getAllSkillsName, addSkills, updateSkill, getAllBusinessName, addBusinessName, updateBusinessName, getDashboardStats, createMobileBanner, updateMobileBanner, getActiveMobileBanner, getAllMobileBanners, deleteMobileBanner } from '../controllers/publicController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';


const router = express.Router();

router.get('/skills', getSkills);
router.get('/getallskillsname', getAllSkillsName);
router.get('/getskills',authenticateToken, getAllSkills);
router.post('/addskills', authenticateToken, addSkills);
router.put('/updateskills/:skillId', authenticateToken, updateSkill);
router.get('/getallbusinessname', getAllBusinessName);
router.post('/addbusinessname', authenticateToken, addBusinessName);
router.put('/updatebusinessname/:businessId', authenticateToken, updateBusinessName);
router.get('/dashboard-stats', authenticateToken, getDashboardStats);
router.get('/mobile-banner/active', getActiveMobileBanner);
router.get('/mobile-banner/admin/all', authenticateToken, isAdmin, getAllMobileBanners);
router.post('/mobile-banner', authenticateToken, isAdmin, createMobileBanner);
router.put('/mobile-banner/:bannerId', authenticateToken, isAdmin, updateMobileBanner);
router.delete('/mobile-banner/:bannerId', authenticateToken, isAdmin, deleteMobileBanner);

export default router;