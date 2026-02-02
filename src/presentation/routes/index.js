import { Router } from 'express';

import playerRoutes from './player.routes.js';
import gameRoutes from './game.routes.js';
import scoreRoutes from './score.routes.js';
import authRoutes from './auth.routes.js';
import cardroutes from './card.routes.js';

import { authenticateToken } from '../middlewares/authentication.middleware.js'; // Import authenticateToken directly

const router = Router();

router.use('/api/auth', authRoutes);
router.use('/api/players', authenticateToken, playerRoutes); // Use authenticateToken directly
router.use('/api/games', authenticateToken, gameRoutes); // Use authenticateToken directly
router.use('/api/scores', authenticateToken, scoreRoutes); // Use authenticateToken directly
router.use('/api/cards', authenticateToken, cardroutes);

export default router;
