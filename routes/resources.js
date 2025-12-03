const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Get resources for a group
router.get('/:groupId', auth, async (req, res) => {
  try {
    const resources = await Resource.find({ groupId: req.params.groupId }).populate('createdBy', 'name email');
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload a resource (file)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { groupId, title } = req.body;
    if (!groupId || !title) {
      return res.status(400).json({ error: 'groupId and title are required' });
    }
    const newResource = new Resource({
      groupId,
      title,
      link: req.file.path, // Cloudinary URL
      type: 'file',
      createdBy: req.user.id,
    });
    const savedResource = await newResource.save();
    // Populate createdBy for consistent response
    await savedResource.populate('createdBy', 'name email');
    res.status(201).json(savedResource);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a resource (link)
router.post('/link', auth, async (req, res) => {
  try {
    const { groupId, title, link } = req.body;
    const newResource = new Resource({
      groupId,
      title,
      link,
      type: 'link',
      createdBy: req.user.id,
    });
    const savedResource = await newResource.save();
    res.status(201).json(savedResource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a resource
router.delete('/:id', auth, async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
