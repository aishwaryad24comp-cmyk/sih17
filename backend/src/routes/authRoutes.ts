import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', authenticate, requireRole(['Admin']), async (req, res) => {
  try {
    const { username, password, role, email, phoneNumber } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      passwordHash,
      role: role || 'Viewer',
      email,
      phoneNumber
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username/Email and password are required' });
    }

    const trimmedInput = username.trim();

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const safeInput = escapeRegExp(trimmedInput);

    // Case-insensitive match on username OR email
    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${safeInput}$`, 'i') } },
        { email: { $regex: new RegExp(`^${safeInput}$`, 'i') } }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'supersecret';
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, email: user.email, phoneNumber: user.phoneNumber },
      secret,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user._id, username: user.username, role: user.role, email: user.email, phoneNumber: user.phoneNumber } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error?.message });
  }
});

// GET /users - Fetch all users (Admin only)
router.get('/users', authenticate, requireRole(['Admin']), async (req, res) => {
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

export default router;
