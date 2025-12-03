const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/user');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Upload group image
router.post('/upload-image', auth, upload.single('file'), async (req, res) => {
  try {
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a group
router.post('/', auth, async (req, res) => {
  try {
    const { groupName, description, password, username, imageURL } = req.body;
    const newGroup = new Group({
      groupName,
      description,
      password,
      username,
      imageURL,
      createdBy: req.user.id,
      members: [req.user.id],
    });
    const savedGroup = await newGroup.save();

    // Add group to user's joinedGroups
    await User.findByIdAndUpdate(req.user.id, {
      $push: { joinedGroups: savedGroup._id },
    });

    res.status(201).json(savedGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all groups for a user
router.get('/mygroups', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const groups = await Group.find({ _id: { $in: user.joinedGroups } });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single group
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'name email avatar');
    if (!group) return res.status(404).json({ msg: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join a group
router.post('/join', auth, async (req, res) => {
  try {
    const { groupId, groupName, username, password } = req.body;
    let group;

    if (groupId) {
      group = await Group.findById(groupId);
    } else if (groupName && username) {
      group = await Group.findOne({ groupName, username });
    }

    if (!group) return res.status(404).json({ msg: 'Group not found' });

    if (group.password !== password) {
      return res.status(400).json({ msg: 'Invalid password' });
    }

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ msg: 'Already a member' });
    }

    group.members.push(req.user.id);
    await group.save();

    await User.findByIdAndUpdate(req.user.id, {
      $push: { joinedGroups: group._id },
    });

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update group (pinned announcement, description)
router.put('/:id', auth, async (req, res) => {
  try {
    const { pinnedAnnouncement, description } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    if (pinnedAnnouncement !== undefined) group.pinnedAnnouncement = pinnedAnnouncement;
    if (description !== undefined) group.description = description;

    await group.save();
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove member
router.delete('/:groupId/members/:userId', auth, async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ msg: 'Group not found' });

    // Only creator can remove members, or user can leave
    if (group.createdBy.toString() !== req.user.id && req.user.id !== userId) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    group.members = group.members.filter(m => m.toString() !== userId);
    await group.save();

    await User.findByIdAndUpdate(userId, {
      $pull: { joinedGroups: groupId },
    });

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
