import { Router } from 'express';

import playerRoutes from './player.routes.js';
import gameRoutes from './game.routes.js';
import scoreRoutes from './score.routes.js';
import authRoutes from './auth.routes.js';
import cardroutes from './card.routes.js';

import authentication from '../middlewares/authentication.middleware.js';

const router = Router();

router.use('/api/auth', authRoutes);
router.use('/api/players', authentication, playerRoutes);
router.use('/api/games', authentication, gameRoutes);
router.use('/api/scores', authentication, scoreRoutes);
router.use('/api/cards', authentication, cardroutes);

export default router;
