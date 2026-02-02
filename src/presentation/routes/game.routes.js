import { Router } from 'express';
import GameController from '../controllers/game.controller.js';
import validateDto from '../middlewares/validateDto.middleware.js';

import authMiddleware from '../middlewares/authentication.middleware.js';

import createGameDtoSchema from '../dtos/createGame.dto.js';
import updateGameDtoSchema from '../dtos/updateGame.dto.js';

const router = Router();
const controller = new GameController();

router.get('/', controller.getAllGames.bind(controller));
router.get('/:id', controller.getGameById.bind(controller));

router.post(
  '/',
  validateDto(createGameDtoSchema),
  controller.createGame.bind(controller),
);

router.put(
  '/:id',
  validateDto(updateGameDtoSchema),
  controller.updateGame.bind(controller),
);

router.get('/:id/join', controller.joinGame.bind(controller));
router.get('/:id/ready', controller.setReady.bind(controller));
router.get('/:id/start', controller.startGame.bind(controller));
router.get('/:id/abandon', controller.abandonGame.bind(controller));
router.get('/:id/status', controller.getGameStatus.bind(controller));
router.get('/:id/discard/top', controller.getDiscardTop.bind(controller));
router.get(
  '/:id/discard/top/simple',
  controller.getDiscardTopSimple.bind(controller),
);
router.post('/discard/top', controller.getDiscardTop.bind(controller));

router.delete('/:id', controller.deleteGame.bind(controller));

router.post(
  '/:id/end',
  authMiddleware, // Obrigatório para verificar se é o criador
  controller.endGame.bind(controller),
);

export default router;
