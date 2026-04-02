import  express from 'express';

import { getSkills, addSkills} from '../controllers/publicController.js';
import {authenticateToken, publicEndpoint} from '../middleware/authMiddleware.js';


const router = express.Router();

router.get('/skills', getSkills);
router.get('/getskills', getSkills);
router.post('/addskills', authenticateToken, addSkills);

export default router;