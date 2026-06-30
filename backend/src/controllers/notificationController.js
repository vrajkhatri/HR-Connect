import prisma from '../config/prisma.js';

// ============================================
// GET NOTIFICATIONS
// ============================================
export const getNotifications = async (req, res) => {
    try {
        const { limit = 20, unreadOnly = false } = req.query;

        const where = {
            userId: req.user.id
        };

        if (unreadOnly === 'true') {
            where.read = false;
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
        });

        // Get unread count
        const unreadCount = await prisma.notification.count({
            where: {
                userId: req.user.id,
                read: false
            }
        });

        res.json({
            success: true,
            data: notifications,
            unreadCount: unreadCount,
            count: notifications.length
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

// ============================================
// MARK NOTIFICATION AS READ
// ============================================
export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: {
                id: parseInt(id),
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        const updated = await prisma.notification.update({
            where: { id: parseInt(id) },
            data: { read: true }
        });

        // Get updated unread count
        const unreadCount = await prisma.notification.count({
            where: {
                userId: req.user.id,
                read: false
            }
        });

        res.json({
            success: true,
            data: updated,
            unreadCount: unreadCount
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
};

// ============================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================
export const markAllNotificationsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.user.id,
                read: false
            },
            data: { read: true }
        });

        res.json({
            success: true,
            message: 'All notifications marked as read',
            unreadCount: 0
        });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
};

// ============================================
// DELETE NOTIFICATION
// ============================================
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: {
                id: parseInt(id),
                userId: req.user.id
            }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        await prisma.notification.delete({
            where: { id: parseInt(id) }
        });

        // Get updated unread count
        const unreadCount = await prisma.notification.count({
            where: {
                userId: req.user.id,
                read: false
            }
        });

        res.json({
            success: true,
            message: 'Notification deleted',
            unreadCount: unreadCount
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
};

// ============================================
// DELETE ALL NOTIFICATIONS
// ============================================
export const deleteAllNotifications = async (req, res) => {
    try {
        await prisma.notification.deleteMany({
            where: {
                userId: req.user.id
            }
        });

        res.json({
            success: true,
            message: 'All notifications deleted'
        });
    } catch (error) {
        console.error('Delete all notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notifications'
        });
    }
};

// ============================================
// ✅ CREATE NOTIFICATION HELPER (For internal use)
// ============================================
export const createNotification = async (userId, title, message, type = 'info') => {
    try {
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
            }
        });
        return notification;
    } catch (error) {
        console.error('Create notification error:', error);
        return null;
    }
};

// ============================================
// ✅ CREATE BULK NOTIFICATIONS (For HR/Admin)
// ============================================
export const createBulkNotifications = async (userIds, title, message) => {
    try {
        if (!userIds || userIds.length === 0) return [];

        const notifications = await prisma.notification.createMany({
            data: userIds.map(userId => ({
                userId,
                title,
                message,
            }))
        });
        return notifications;
    } catch (error) {
        console.error('Create bulk notifications error:', error);
        return null;
    }
};

// ============================================
// ✅ GET UNREAD COUNT FOR USER
// ============================================
export const getUnreadCount = async (userId) => {
    try {
        const count = await prisma.notification.count({
            where: {
                userId,
                read: false
            }
        });
        return count;
    } catch (error) {
        console.error('Get unread count error:', error);
        return 0;
    }
};