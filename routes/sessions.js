const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const User = require('../models/user');
const auth = require('../middleware/auth');

// Get all sessions for the current user (across all joined groups)
router.get('/my-sessions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const sessions = await Session.find({ groupId: { $in: user.joinedGroups } })
      .populate('groupId', 'groupName') // Populate group name for calendar display
      .sort({ date: 1, time: 1 });
      
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sessions for a group
router.get('/:groupId', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ groupId: req.params.groupId })
      .populate('createdBy', 'name email')
      .sort({ date: 1, time: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a session
router.post('/', auth, async (req, res) => {
  try {
    const { groupId, title, date, time, link } = req.body;
    const newSession = new Session({
      groupId,
      title,
      date,
      time,
      link,
      createdBy: req.user.id,
    });
    const savedSession = await newSession.save();
    res.status(201).json(savedSession);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete session
router.delete('/:id', auth, async (req, res) => {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
