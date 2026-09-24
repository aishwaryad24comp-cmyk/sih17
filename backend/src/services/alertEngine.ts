import cron from 'node-cron';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import Project from '../models/Project';
import Notification from '../models/Notification';
import User from '../models/User';
import { io } from '../server';

// Lazy transporter — created on first use so env vars are guaranteed loaded
let _transporter: any = null;
function getTransporter() {
  if (!_transporter) {
    // Force-load env vars right now
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    
    const emailUser = process.env.ALERT_EMAIL_ADDRESS;
    const emailPass = process.env.ALERT_EMAIL_PASSWORD;
    console.log(`📧 [Email] Initializing transporter with user: ${emailUser ? emailUser : 'MISSING!'}`);
    
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
  }
  return _transporter;
}

// This job runs every 2 hours in production, but we will schedule it for every 10 minutes for testing
export const startAlertEngine = () => {
  console.log('🤖 Alert Engine initialized. Scheduling cron jobs...');

  cron.schedule('*/10 * * * * *', async () => {
    console.log('🔍 [Alert Engine] Scanning projects for risks and stalls...');
    
    try {
      const projects = await Project.find({});
      
      for (const p of projects) {
        const riskPct = p.predicted_risk_pct ?? (p.risk_score_raw ? Math.round(p.risk_score_raw * 100) : 0);
        // 1. High Risk Alert (>= 65%)
        if (riskPct >= 65) {
          await createUniqueAlert(
            p.project_id, 
            'HIGH_RISK', 
            `Critical Risk Alert: Project ${p.project_id} in ${p.district} has a ${riskPct}% delay probability.`,
            { ...p.toObject(), predicted_risk_pct: riskPct }
          );
        }

        // 2. Silent Stall Alert (Using delay_days as proxy since last_activity_date is string)
        if (p.delay_days && p.delay_days > 90) {
          await createUniqueAlert(
            p.project_id, 
            'STALL', 
            `Silent Stall Warning: Project ${p.project_id} is ${p.delay_days} days behind schedule.`,
            p
          );
        }
      }
    } catch (err) {
      console.error('[Alert Engine] Error running scan:', err);
    }
  });
};

async function createUniqueAlert(projectId: string, type: 'STALL' | 'HIGH_RISK', message: string, projectData: any) {
  // Only create if there isn't already an UNREAD alert of the same type for this project
  const existingAlert = await Notification.findOne({
    projectId,
    type,
    isRead: false
  });

  if (!existingAlert) {
    // 1. Alert all Admins
    const adminNotif = await Notification.create({ recipientRole: 'Admin', message, type, projectId });
    
    // 2. Alert the specific Official who owns the project (the Project Manager)
    if (projectData.created_by) {
      await Notification.create({ 
        recipientRole: 'Official', 
        recipientUserId: projectData.created_by,
        message, 
        type, 
        projectId 
      });
    }

    console.log(`🔔 [Alert Engine] Triggered ${type} alert for project ${projectId}`);
    
    // 🔥 1. Emit Real-Time Socket Event to the React Dashboard
    io.emit('new_alert', { 
      ...adminNotif.toObject(), 
      projectName: projectData.name || projectData.project_type,
      recipientUserId: projectData.created_by
    });

    // 🔥 2. Send Email directly (no Redis/BullMQ needed)
    if (type === 'HIGH_RISK') {
      await sendAlertEmail({
        projectId,
        projectName: projectData.name || projectData.project_type || 'Unknown Project',
        riskPct: projectData.predicted_risk_pct,
        district: projectData.district,
        createdBy: projectData.created_by
      });
    }
  }
}

export async function sendAlertEmail(data: { projectId: string; projectName: string; riskPct: number; district: string; createdBy?: string }) {
  try {
    // Send to all users registered in MongoDB with a non-empty email address
    const users = await User.find({ email: { $exists: true, $ne: '' } });

    if (users.length === 0) {
      console.log(`📧 [Email] No eligible users with email addresses found to alert.`);
      return;
    }

    const messageBody = `🚨 PrediXa HIGH RISK ALERT: Project ${data.projectName} (${data.projectId}) in ${data.district} has a ${Math.round(data.riskPct || 85)}% failure probability. Immediate action required.`;

    if (process.env.ALERT_EMAIL_ADDRESS && process.env.ALERT_EMAIL_PASSWORD) {
      for (const user of users) {
        if (user.email) {
          try {
            await getTransporter().sendMail({
              from: `"PrediXa Alert System" <${process.env.ALERT_EMAIL_ADDRESS}>`,
              to: user.email,
              subject: `🚨 URGENT: High Risk Alert for ${data.projectId}`,
              text: messageBody,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #dc2626;">🚨 PrediXa High-Risk Alert</h2>
                  <p><strong>Project:</strong> ${data.projectName} (${data.projectId})</p>
                  <p><strong>Location:</strong> ${data.district}</p>
                  <p><strong>Failure Probability:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 1.2em;">${Math.round(data.riskPct || 85)}%</span></p>
                  <hr style="border: 1px solid #f1f5f9; margin: 20px 0;" />
                  <p>Immediate action is required to prevent project stalling. Please log into the PrediXa dashboard to view the delay drivers.</p>
                </div>
              `
            });
            console.log(`📧 [Email] Alert sent successfully to ${user.username} (${user.email})`);
          } catch (emailErr: any) {
            console.error(`📧 [Email] Failed to send to ${user.email}:`, emailErr.message);
          }
        }
      }
    } else {
      console.log(`📧 [Email - MOCK] Email credentials not configured. Would have sent to ${users.length} users.`);
    }
  } catch (err) {
    console.error('📧 [Email] Error sending alert emails:', err);
  }
}
