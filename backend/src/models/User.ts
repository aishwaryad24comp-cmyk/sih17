import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: string;
  phoneNumber?: string;
  email?: string;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['Admin', 'Official', 'Viewer'], default: 'Viewer' },
  phoneNumber: { type: String, required: false },
  email: { type: String, required: false }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
