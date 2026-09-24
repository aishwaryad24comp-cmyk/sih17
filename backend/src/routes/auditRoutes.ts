import { Router } from 'express';
import AuditLog from '../models/AuditLog';
import { authenticate, requireRole, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Only Admins and Officials should view audit logs
router.get('/', authenticate, requireRole(['Admin', 'Official']), async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.query;
    let query = {};
    
    if (projectId) {
      query = { details: { $regex: projectId as string, $options: 'i' } };
    }

    // Sort by most recent first
    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

export default router;
