const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

const notifyTasksUpdated = (req) => {
  const io = req.app.get('io');
  const socketId = req.headers['x-socket-id'];
  if (io) {
    if (socketId) io.to(`user_${req.user.id}`).except(socketId).emit('server:tasks_updated');
    else io.to(`user_${req.user.id}`).emit('server:tasks_updated');
  }
};

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      orderBy: { orderIndex: 'asc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { categories: true }
    });
    res.json(user.categories || []);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.put('/categories', async (req, res) => {
  try {
    const { categories } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { categories }
    });
    notifyTasksUpdated(req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, text, category, done, indentLevel, orderIndex } = req.body;
    const task = await prisma.task.create({
      data: {
        id: id || undefined,
        text,
        category,
        done: done || false,
        indentLevel: indentLevel || 0,
        orderIndex: orderIndex || 0,
        userId: req.user.id
      }
    });
    notifyTasksUpdated(req);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { text, category, done, indentLevel, orderIndex } = req.body;
    await prisma.task.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { text, category, done, indentLevel, orderIndex }
    });
    notifyTasksUpdated(req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.task.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    notifyTasksUpdated(req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.delete('/category/:categoryName', async (req, res) => {
  try {
    await prisma.task.deleteMany({
      where: { category: req.params.categoryName, userId: req.user.id }
    });
    notifyTasksUpdated(req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

module.exports = router;
