import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(REDIS_URL, { 
  maxRetriesPerRequest: null,
  tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

// Create a reusable transporter using Gmail (if configured) or fallback to Ethereal
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_ADDRESS,
    pass: process.env.ALERT_EMAIL_PASSWORD
  }
});

export const alertQueue = new Queue('AlertQueue', { connection });

interface AlertJobData {
  projectId: string;
  projectName: string;
  riskPct: number;
  district: string;
  createdBy: string;
}

const worker = new Worker('AlertQueue', async job => {
  const data = job.data as AlertJobData;
  console.log(`[BullMQ] Processing High-Risk Alert for Project ${data.projectId}`);

  try {
    // 1. Find Admins AND the specific Official (Project Manager) who owns this project
    const users = await User.find({ 
      $or: [
        { role: 'Admin' },
        { _id: data.createdBy }
      ],
      email: { $exists: true, $ne: '' }
    });

    if (users.length === 0) {
      console.log(`[BullMQ] No eligible users with email addresses found to alert.`);
      return;
    }

    // 2. Dispatch Email via Nodemailer to all eligible officials
    const messageBody = `🚨 PrediXa HIGH RISK ALERT: Project ${data.projectName} (${data.projectId}) in ${data.district} has a ${Math.round(data.riskPct)}% failure probability. Immediate action required.`;

    if (process.env.ALERT_EMAIL_ADDRESS && process.env.ALERT_EMAIL_PASSWORD) {
      for (const user of users) {
        if (user.email) {
          try {
            await transporter.sendMail({
              from: `"PrediXa Alert System" <${process.env.ALERT_EMAIL_ADDRESS}>`,
              to: user.email,
              subject: `🚨 URGENT: High Risk Alert for ${data.projectId}`,
              text: messageBody,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #dc2626;">🚨 PrediXa High-Risk Alert</h2>
                  <p><strong>Project:</strong> ${data.projectName} (${data.projectId})</p>
                  <p><strong>Location:</strong> ${data.district}</p>
                  <p><strong>Failure Probability:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 1.2em;">${Math.round(data.riskPct)}%</span></p>
                  <hr style="border: 1px solid #f1f5f9; margin: 20px 0;" />
                  <p>Immediate action is required to prevent project stalling. Please log into the Bhumi Sentinel dashboard to view the delay drivers.</p>
                </div>
              `
            });
            console.log(`[Email] Alert sent successfully to ${user.username} (${user.email})`);
          } catch (emailErr: any) {
            console.error(`[Email] Failed to send to ${user.email}:`, emailErr.message);
          }
        }
      }
    } else {
      console.log(`[BullMQ - MOCK] Email credentials not configured in .env. Would have sent email to ${users.length} users.`);
      console.log(`[BullMQ - MOCK] Payload: "${messageBody}"`);
    }

  } catch (err) {
    console.error('[BullMQ] Worker Error:', err);
    throw err;
  }
}, { connection });

worker.on('completed', job => {
  console.log(`[BullMQ] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[BullMQ] Job ${job?.id} failed with error:`, err.message);
});
