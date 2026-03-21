const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authenticateToken);

router.post('/', async (req, res) => {
  try {
    const { name, nodes, edges, viewport } = req.body;
    const board = await prisma.board.create({
      data: {
        name: name || "Nouvelle Carte",
        nodes: nodes || [],
        edges: edges || [],
        viewport: viewport || { x: 0, y: 0, zoom: 1 },
        userId: req.user.id
      }
    });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.get('/', async (req, res) => {
  try {
    const boards = await prisma.board.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const board = await prisma.board.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!board) return res.status(404).json({ error: 'Carte introuvable' });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, nodes, edges, viewport } = req.body;
    const board = await prisma.board.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { name, nodes, edges, viewport }
    });
    if (board.count === 0) return res.status(404).json({ error: 'Carte introuvable' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const board = await prisma.board.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

module.exports = router;
