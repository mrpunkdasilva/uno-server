import express from 'express';
import DebugController from '../controllers/debug.controller.js';
import { authenticateToken } from '../middlewares/authentication.middleware.js';

const router = express.Router();

export const createDebugRoutes = (gameService, scoreService) => {
  const controller = new DebugController(gameService, scoreService);

  router.post(
    '/:id/debug/accelerate-end',
    authenticateToken,
    controller.accelerateGameEnd.bind(controller),
  );

  router.post(
    '/:id/debug/remove-playable-cards',
    authenticateToken,
    controller.removePlayableCards.bind(controller),
  );

  return router;
};

export default createDebugRoutes;
