import express from 'express';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteAllNotifications
} from '../controllers/notificationController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

console.log('🔔 Setting up notification routes...');

router.get('/', auth, getNotifications);
router.put('/:id/read', auth, markNotificationRead);
router.put('/read-all', auth, markAllNotificationsRead);
router.delete('/:id', auth, deleteNotification);
router.delete('/all', auth, deleteAllNotifications);

console.log('✅ Notification routes registered:');
console.log('  GET  /notifications');
console.log('  PUT  /notifications/:id/read');
console.log('  PUT  /notifications/read-all');
console.log('  DELETE /notifications/:id');
console.log('  DELETE /notifications/all');

export default router;