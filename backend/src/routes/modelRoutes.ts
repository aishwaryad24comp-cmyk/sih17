import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/authMiddleware';
import AuditLog from '../models/AuditLog';
import { exec } from 'child_process';
import path from 'path';

const router = Router();

router.post('/retrain', authenticate, requireRole(['Admin', 'Official']), async (req: AuthRequest, res: any) => {
  try {
    const pythonScriptsPath = process.env.PYTHON_SCRIPTS_PATH || '../sih-reference/Manushree';
    
    // Log the initiation
    await AuditLog.create({
      userId: req.user?.id || 'unknown',
      action: 'RETRAIN_MODEL_INITIATED',
      details: 'Triggered model retraining script.'
    });

    // Determine absolute path to the training script
    const scriptPath = path.resolve(__dirname, '..', '..', pythonScriptsPath);

    // This executes Manushree's training script via child_process
    // We execute train_classifier.py as an example
    exec('python train_classifier.py', { cwd: scriptPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing retraining: ${error.message}`);
        // We log failure but the HTTP request already returns to not block the frontend for long training times
        return;
      }
      if (stderr) {
        console.error(`stderr from retraining: ${stderr}`);
      }
      console.log(`stdout from retraining: ${stdout}`);
      
      // Log completion
      AuditLog.create({
        userId: req.user?.id || 'unknown',
        action: 'RETRAIN_MODEL_COMPLETED',
        details: 'Model retraining script completed successfully.'
      }).catch(err => console.error('Error logging audit:', err));
    });

    res.status(202).json({ message: 'Model retraining has been triggered successfully and is running in the background.' });
  } catch (error) {
    console.error('Error triggering retraining:', error);
    res.status(500).json({ message: 'Server error triggering model retrain' });
  }
});

export default router;
