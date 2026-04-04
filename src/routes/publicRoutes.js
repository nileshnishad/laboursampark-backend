import  express from 'express';

import { getSkills, getAllSkills, addSkills, updateSkill, getDashboardStats } from '../controllers/publicController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';


const router = express.Router();

router.get('/skills', getSkills);
router.get('/getskills',authenticateToken, getAllSkills);
router.post('/addskills', authenticateToken, addSkills);
router.put('/updateskills/:skillId', authenticateToken, updateSkill);
router.get('/dashboard-stats', authenticateToken, getDashboardStats);

export default router;