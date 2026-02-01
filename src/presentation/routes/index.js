import { Router } from 'express';

import playerRoutes from './player.routes.js';
import gameRoutes from './game.routes.js';
import scoreRoutes from './score.routes.js';
import authRoutes from './auth.routes.js';

import { authenticateToken } from '../middlewares/authentication.middleware.js';

const router = Router();

router.use('/api/auth', authRoutes);
router.use('/api/players', authenticateToken, playerRoutes);
router.use('/api/games', authenticateToken, gameRoutes);
router.use('/api/scores', authenticateToken, scoreRoutes);

export default router;
