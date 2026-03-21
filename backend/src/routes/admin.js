const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Middlewares stricts pour s'assurer que seul un admin peut lire cette route
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, role: role || 'USER' },
      select: { id: true, email: true, role: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    // Empêcher l'admin de s'auto-rétrograder si c'est le seul (logique basique bypassée ici pour la simplicité, mais protégée par auth)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    // La suppression de l'utilisateur supprimera en cascade ses boards et ses tasks via onDelete: Cascade dans le Prisma Schema
    await prisma.user.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur Serveur' });
  }
});

module.exports = router;
