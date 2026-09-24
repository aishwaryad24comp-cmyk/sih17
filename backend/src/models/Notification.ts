import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipientRole: string; // e.g. 'Admin', 'Official'
  recipientUserId?: string; // Target specific user ID
  message: string;
  type: string; // 'STALL', 'HIGH_RISK', 'SYSTEM'
  projectId?: string; // Optional reference to a specific project
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  recipientRole: { type: String, required: true },
  recipientUserId: { type: String, required: false },
  message: { type: String, required: true },
  type: { type: String, required: true, enum: ['STALL', 'HIGH_RISK', 'SYSTEM'] },
  projectId: { type: String, required: false },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<INotification>('Notification', NotificationSchema);
