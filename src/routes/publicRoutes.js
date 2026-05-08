import  express from 'express';

import { getSkills, getAllSkills, getAllSkillsName, addSkills, updateSkill, getAllBusinessName, addBusinessName, updateBusinessName, getDashboardStats } from '../controllers/publicController.js';
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

export default router;