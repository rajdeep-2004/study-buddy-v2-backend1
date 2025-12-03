const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const auth = require('../middleware/auth');

// Get todos for a group
router.get('/:groupId', auth, async (req, res) => {
  try {
    const todos = await Todo.find({ groupId: req.params.groupId }).populate('createdBy', 'name email');
    const todosWithCompletion = todos.map(todo => ({
      ...todo.toObject(),
      completed: todo.completedBy.some(id => id.toString() === req.user.id)
    }));
    res.json(todosWithCompletion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a todo
router.post('/', auth, async (req, res) => {
  try {
    const { groupId, text } = req.body;
    const newTodo = new Todo({
      groupId,
      text,
      createdBy: req.user.id,
    });
    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle todo completion
router.put('/:id', auth, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    const userId = req.user.id;
    
    if (todo.completedBy.includes(userId)) {
      todo.completedBy.pull(userId);
    } else {
      todo.completedBy.push(userId);
    }
    
    await todo.save();
    
    // Return with computed completed status
    const todoObj = todo.toObject();
    todoObj.completed = todo.completedBy.some(id => id.toString() === userId);
    
    res.json(todoObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete todo
router.delete('/:id', auth, async (req, res) => {
  try {
    await Todo.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
