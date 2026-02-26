import { Router } from 'express';

import playerRoutes from './player.routes.js';
import gameRoutes from './game.routes.js';
import scoreRoutes from './score.routes.js';
import authRoutes from './auth.routes.js';
import cardroutes from './card.routes.js';
import apiUsageRoutes from './api-usage.routes.js';

import { authenticateToken } from '../middlewares/authentication.middleware.js';
import memoizationMiddleware from '../middlewares/memoization.middleware.js';

import { defaultCacheConfig } from '../../config/cache.js';

const router = Router();

router.use('/api/auth', authRoutes, memoizationMiddleware(defaultCacheConfig));

router.use(
  '/api/players',
  authenticateToken,
  memoizationMiddleware(defaultCacheConfig),
  playerRoutes,
);

router.use(
  '/api/games',
  authenticateToken,
  memoizationMiddleware(defaultCacheConfig),
  gameRoutes,
);

router.use(
  '/api/scores',
  authenticateToken,
  memoizationMiddleware(defaultCacheConfig),
  scoreRoutes,
);

router.use(
  '/api/cards',
  authenticateToken,
  memoizationMiddleware(defaultCacheConfig),
  cardroutes,
);
router.use('/api/stats', apiUsageRoutes);

export default router;
