import express from 'express';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import Notification from '../models/Notification';

import { sendAlertEmail } from '../services/alertEngine';

const router = express.Router();

// POST /api/notifications/test-email - Trigger a test email alert to all users with email
router.post('/test-email', async (req, res) => {
  try {
    const { projectId, projectName, riskPct, district } = req.body || {};
    
    await sendAlertEmail({
      projectId: projectId || 'LA-2026-TEST',
      projectName: projectName || 'High-Risk Infrastructure Project',
      riskPct: Number(riskPct) || 88,
      district: district || 'Nashik',
    });

    res.json({ message: 'Test email alert dispatched successfully!' });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Failed to send test email', error: error.message });
  }
});

// Get unread notifications for the logged-in user's role
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    // Viewers don't get these system alerts
    if (!userRole || userRole === 'Viewer') {
      return res.json([]);
    }

    const query: any = { 
      recipientRole: userRole,
      isRead: false 
    };

    // If the user is an Official, they only see notifications specifically targeting them
    if (userRole === 'Official') {
      query.recipientUserId = userId;
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

// Mark a notification as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const notificationId = req.params.id;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const query: any = { _id: notificationId, recipientRole: userRole };
    if (userRole === 'Official') {
      query.recipientUserId = userId;
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
});

export default router;
