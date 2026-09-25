import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import modelRoutes from './routes/modelRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import auditRoutes from './routes/auditRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { startAlertEngine } from './services/alertEngine';
import { createServer } from 'http';
import { Server } from 'socket.io';
import User from './models/User';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sih_db';

const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 [Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint for cloud platforms (Render/Vercel)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', dbState: mongoose.connection.readyState });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/model', modelRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);

// Always start HTTP server immediately so Render port binding succeeds
httpServer.listen(PORT, () => {
  console.log(`Server & Socket.io are running on port ${PORT}`);
});

// Connect to MongoDB with IPv4 resolution (family: 4) to avoid SRV DNS issues on cloud hosts
mongoose.connect(MONGODB_URI, {
  family: 4
})
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Seed default admin if no users exist
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('No users found in database. Creating default admin account...');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);
        await User.create({
          username: 'admin',
          passwordHash,
          role: 'Admin',
          email: 'admin@predixa.local'
        });
        console.log('Default Admin created! Username: admin | Password: password123');
      }
    } catch (err: any) {
      console.error('Error during database initialization:', err.message);
    }

    startAlertEngine();
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
  });
