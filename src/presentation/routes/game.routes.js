import { Router } from 'express';
import GameController from '../controllers/game.controller.js';
import validateDto from '../middlewares/validateDto.middleware.js';

import createGameDtoSchema from '../dtos/createGame.dto.js';
import updateGameDtoSchema from '../dtos/updateGame.dto.js';
import joinGameDtoSchema from '../dtos/joinGame.dto.js';

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

router.post(
  '/join',
  validateDto(joinGameDtoSchema),
  controller.joinGame.bind(controller),
);

router.put(
  '/:id',
  validateDto(updateGameDtoSchema),
  controller.updateGame.bind(controller),
);

router.post(
  '/join',
  controller.startGame.bind(controller),
);
router.delete('/:id', controller.deleteGame.bind(controller));

export default router;
