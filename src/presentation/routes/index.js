import { Router } from 'express';
import playerRoutes from './player.routes.js';
import gameRoutes from '../routes/game.routes.js';
import scoreRoutes from './score.routes.js';

const router = Router();

router.use('/api/players', playerRoutes);
router.use('/api/games', gameRoutes);
router.use('/api/scores', scoreRoutes);

export default router;
