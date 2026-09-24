import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Project from '../models/Project';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No authentication token, access denied.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'supersecret';
    const decoded = jwt.verify(token, secret) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is invalid or expired.' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions.' });
    }
    next();
  };
};

// Feature #24: Ownership-check middleware
export const requireOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Admins can edit anything
    if (req.user.role === 'Admin') {
      return next();
    }

    // Officials can only edit if they are the creator
    if (req.user.role === 'Official') {
      const project = await Project.findOne({ project_id: projectId });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (project.created_by !== req.user.id) {
        return res.status(403).json({ message: 'Access denied: You do not own this project.' });
      }
      return next();
    }

    // Viewers and Landowners cannot edit anything
    return res.status(403).json({ message: 'Access denied: insufficient permissions.' });
  } catch (error) {
    console.error('Error in requireOwnership middleware:', error);
    res.status(500).json({ message: 'Server error checking ownership' });
  }
};
