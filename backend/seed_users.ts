import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sih_db';

async function seedUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const usersToSeed = [
      { username: 'admin', rawPassword: 'admin', role: 'Admin', phone: process.env.TEST_RECEIVER_PHONE || '+1234567890', email: process.env.ALERT_EMAIL_ADDRESS || 'test@example.com' },
      { username: 'official', rawPassword: 'official', role: 'Official', phone: process.env.TEST_RECEIVER_PHONE || '+1234567890', email: process.env.ALERT_EMAIL_ADDRESS || 'test@example.com' },
      { username: 'viewer', rawPassword: 'viewer', role: 'Viewer', phone: '' }
    ];

    for (const data of usersToSeed) {
      const existing = await User.findOne({ username: data.username });
      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.rawPassword, salt);
        
        const payload: any = {
          username: data.username,
          passwordHash,
          role: data.role
        };
        
        if (data.phone) {
          payload.phoneNumber = data.phone;
        }

        const newUser = new User(payload);
        await newUser.save();
        console.log(`Default ${data.role.toLowerCase()} created: ${data.username} / ${data.rawPassword}`);
      } else {
        console.log(`${data.role} user '${data.username}' already exists.`);
        
        // Ensure existing users get the phone number update for testing
        if (data.phone && !existing.phoneNumber) {
          existing.phoneNumber = data.phone;
          await existing.save();
          console.log(`Updated existing user '${data.username}' with phone number.`);
        }
      }
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedUsers();
