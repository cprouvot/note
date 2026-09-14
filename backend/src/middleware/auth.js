const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Session glissante : le jeton expire après JWT_EXPIRES_IN d'inactivité.
// Tant qu'il sert, il est renouvelé au plus une fois par jour via l'en-tête REFRESHED_TOKEN_HEADER.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const RENEW_AFTER_SECONDS = 24 * 60 * 60;
const REFRESHED_TOKEN_HEADER = 'X-Refreshed-Token';

const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const sessionExpired = (res) => res.status(401).json({ error: 'Session expirée : reconnectez-vous.', code: 'SESSION_EXPIRED' });

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Attendu: "Bearer TOKEN_XXX"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Aucun token fourni.', code: 'SESSION_EXPIRED' });
  }

  jwt.verify(token, JWT_SECRET, async (err, payload) => {
    if (err) return sessionExpired(res);
    req.user = { id: payload.id, role: payload.role };

    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSeconds < RENEW_AFTER_SECONDS) return next();

    try {
      // Relire l'utilisateur au renouvellement : reflète un changement de rôle, refuse un compte supprimé
      const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, role: true } });
      if (!user) return sessionExpired(res);
      req.user = user;
      res.setHeader(REFRESHED_TOKEN_HEADER, signToken(user));
    } catch (error) {
      // Base indisponible : la requête continue avec le jeton actuel, encore valide
      console.error('[auth] Renouvellement de session impossible', error);
    }
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Accès administrateur strictement requis pour cette action.' });
  }
};

module.exports = { authenticateToken, requireAdmin, signToken, REFRESHED_TOKEN_HEADER };
