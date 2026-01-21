import { Router } from 'express';
import GameController from '../controllers/game.controller.js';
import validateDto from '../middlewares/validateDto.middleware.js';

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

router.delete('/:id', controller.deleteGame.bind(controller));

export default router;
