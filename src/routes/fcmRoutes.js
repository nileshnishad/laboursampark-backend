import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js';
import { sendFCMNotification, sendFCMToUser, getFCMStats, getTokenUsers } from '../controllers/fcmController.js';

const router = express.Router();

router.post('/send', authenticateToken, isAdmin, sendFCMNotification);
router.post('/send-to-user', authenticateToken, isAdmin, sendFCMToUser);
router.get('/stats', authenticateToken, isAdmin, getFCMStats);
router.get('/token-users', authenticateToken, isAdmin, getTokenUsers);

export default router;
