const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authenticateToken);

router.post('/', async (req, res) => {
  try {
    const { name, nodes, edges, viewport, orderIndex } = req.body;
    const board = await prisma.board.create({
      data: {
        name: name || "Nouvelle Carte",
        nodes: nodes || [],
        edges: edges || [],
        viewport: viewport || { x: 0, y: 0, zoom: 1 },
        orderIndex: orderIndex || 0,
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
      orderBy: { orderIndex: 'asc' }
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

router.put('/reorder/batch', async (req, res) => {
  try {
    const { boardIds } = req.body;
    if (!boardIds || !Array.isArray(boardIds)) return res.status(400).json({ error: 'Format invalide' });
    
    const updates = boardIds.map((id, index) => 
      prisma.board.updateMany({
        where: { id, userId: req.user.id },
        data: { orderIndex: index }
      })
    );
    await prisma.$transaction(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, nodes, edges, viewport, orderIndex } = req.body;
    const board = await prisma.board.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { name, nodes, edges, viewport, orderIndex }
    });
    if (board.count === 0) return res.status(404).json({ error: 'Carte introuvable' });
    
    // Broadcast de la mise à jour via Socket.io
    const io = req.app.get('io');
    const socketId = req.headers['x-socket-id'];
    if (io) {
      if (socketId) {
        io.to(`board_${req.params.id}`).except(socketId).emit('server:board_updated');
      } else {
        io.to(`board_${req.params.id}`).emit('server:board_updated');
      }
    }
    
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
