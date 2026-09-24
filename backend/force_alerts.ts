import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sih_db').then(async () => {
  console.log('Connected');
  const Project = (await import('./src/models/Project')).default;
  const Notification = (await import('./src/models/Notification')).default;
  
  const projects = await Project.find({});
  await Notification.deleteMany({}); // Clear old broken alerts

  for (const p of projects) {
    if (p.predicted_risk_pct && p.predicted_risk_pct > 80) {
      await Notification.create({ recipientRole: 'Admin', message: `Critical Risk Alert: Project ${p.project_id} in ${p.district} has surpassed 80% delay probability.`, type: 'HIGH_RISK', projectId: p.project_id });
      await Notification.create({ recipientRole: 'Official', message: `Critical Risk Alert: Project ${p.project_id} in ${p.district} has surpassed 80% delay probability.`, type: 'HIGH_RISK', projectId: p.project_id });
    }
    if (p.delay_days && p.delay_days > 90) {
      await Notification.create({ recipientRole: 'Admin', message: `Silent Stall Warning: Project ${p.project_id} is ${p.delay_days} days behind schedule.`, type: 'STALL', projectId: p.project_id });
      await Notification.create({ recipientRole: 'Official', message: `Silent Stall Warning: Project ${p.project_id} is ${p.delay_days} days behind schedule.`, type: 'STALL', projectId: p.project_id });
    }
  }
  console.log('Done seeding alerts');
  process.exit(0);
});
