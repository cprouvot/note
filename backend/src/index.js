const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const taskRoutes = require('./routes/tasks');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend Server API running on port ${PORT}`);
});
