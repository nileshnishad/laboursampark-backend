import  express from 'express';

import { getSkills, getAllSkills, addSkills, getDashboardStats } from '../controllers/publicController.js';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';


const router = express.Router();

router.get('/skills', getSkills);
router.get('/getskills',authenticateToken, getAllSkills);
router.post('/addskills', authenticateToken, addSkills);
router.get('/dashboard-stats', authenticateToken, getDashboardStats);

export default router;