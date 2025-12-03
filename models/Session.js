const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  date: {
    type: String, // Storing as string to match frontend "YYYY-MM-DD"
    required: true,
  },
  time: {
    type: String, // Storing as string to match frontend "HH:MM"
    required: true,
  },
  link: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Session', sessionSchema);
