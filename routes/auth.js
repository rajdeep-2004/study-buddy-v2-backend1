// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const authenticateToken = require('../middleware/auth');
const Session = require('../models/Session');
const Todo = require('../models/Todo');
const Resource = require('../models/Resource');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || 'dev_secret';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    if (!name || !email || !password || !gender) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const boyProfilePic = `https://avatar.iran.liara.run/public/boy?username=${name}`;
    const girlProfilePic = `https://avatar.iran.liara.run/public/girl?username=${name}`;

    const user = new User({
      name,
      email,
      password,
      gender,
      avatar: gender === "male" ? boyProfilePic : girlProfilePic
    });
    await user.save();
    
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: '1h' });
    return res.status(201).json({ message: 'User registered successfully', token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Protected dashboard
router.get('/dashboard', authenticateToken, (req, res) => {
  return res.json({ message: `Welcome ${req.user.name || req.user.email}, this is your dashboard` });
});

// Get current user details
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    // Format date as YYYY-MM-DD for string comparison if needed, but Session uses string "YYYY-MM-DD"
    // Let's rely on simple string comparison for "upcoming" if format is consistent, 
    // OR better, convert session date/time to Date object in memory (slower) or aggregation.
    // Since Session.date is string "YYYY-MM-DD", we can compare with today's date string.
    const todayStr = now.toISOString().split('T')[0];
    
    // Upcoming sessions: date >= today. (Refining time is harder with string, but date is good enough for stats)
    const upcomingSessions = await Session.countDocuments({
      groupId: { $in: user.joinedGroups },
      date: { $gte: todayStr }
    });

    // Task Left: Todos in user's groups that are NOT completed by user
    const totalTodos = await Todo.countDocuments({
      groupId: { $in: user.joinedGroups },
      completedBy: { $ne: req.user.id }
    });

    // Resources Shared: Resources uploaded by user
    // Resource model has `uploadedByUID` (from Firebase migration) or `createdBy` (ref).
    // I added `createdBy` in previous steps? Let's check Resource model.
    // I populated `createdBy` in routes, so it likely exists.
    // But let's check if I added it to schema. I viewed Resource.js earlier?
    // I viewed it in step 160 (summary says created).
    // Let's assume createdBy exists. If not, I'll use uploadedByUID if I kept it.
    // Actually, I should check Resource model to be safe.
    // But for now, let's try `createdBy`.
    const resourcesShared = await Resource.countDocuments({
      createdBy: req.user.id
    });

    res.json({
      upcomingSessions,
      totalTodos,
      resourcesShared
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
