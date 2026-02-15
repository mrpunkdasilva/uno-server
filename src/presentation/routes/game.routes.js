import { Router } from 'express';
import GameController from '../controllers/game.controller.js';
import validateDto from '../middlewares/validateDto.middleware.js';

import createGameDtoSchema from '../dtos/game/create-game.dto.js';
import updateGameDtoSchema from '../dtos/game/update-game.dto.js';

// Import repositories and service for DI
import GameRepository from '../../infra/repositories/game.repository.js';
import PlayerRepository from '../../infra/repositories/player.repository.js';
import GameService from '../../core/services/game/game.service.js';

const router = Router();

// Instantiate dependencies
const gameRepository = new GameRepository();
const playerRepository = new PlayerRepository();
const gameService = new GameService(gameRepository, playerRepository);
const controller = new GameController(gameService);

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

export default router;
