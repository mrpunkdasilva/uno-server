import { Router } from 'express';
import GameController from '../controllers/game.controller.js';
import validateDto from '../middlewares/validateDto.middleware.js';

import createGameDtoSchema from '../dtos/game/create-game.dto.js';
import updateGameDtoSchema from '../dtos/game/update-game.dto.js';
import playCardDtoSchema from '../dtos/game/play-card.dto.js';

// Import repositories and service for DI
import GameRepository from '../../infra/repositories/game.repository.js';
import PlayerRepository from '../../infra/repositories/player.repository.js';
import ScoreRepository from '../../infra/repositories/score.repository.js';
import GameService from '../../core/services/game/game.service.js';
import GameHistoryServices from '../../core/services/game/game.history.service.js';
import ScoreService from '../../core/services/score.service.js';

const router = Router();

// Instantiate dependencies
const gameRepository = new GameRepository();
const playerRepository = new PlayerRepository();
const scoreRepository = new ScoreRepository();
const scoreService = new ScoreService(scoreRepository);
const gameHistoryService = new GameHistoryServices(
  gameRepository,
  playerRepository,
);
const gameService = new GameService(
  gameRepository,
  playerRepository,
  scoreService,
);
const controller = new GameController(gameService, gameHistoryService);

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
router.get('/:id/scores', controller.getGameScores.bind(controller));
router.get('/:id/discard/top', controller.getDiscardTop.bind(controller));
router.get('/:id/history', controller.getGameHistory.bind(controller));
router.get(
  '/:id/discard/top/simple',
  controller.getDiscardTopSimple.bind(controller),
);
router.get('/:id/state', controller.getFullGameState.bind(controller));
router.post('/discard/top', controller.getDiscardTop.bind(controller));

router.post('/:id/hand', controller.getPlayerHand.bind(controller));
router.put('/:id/draw', controller.drawCard.bind(controller));

router.post(
  '/:id/play',
  validateDto(playCardDtoSchema),
  controller.playCard.bind(controller),
);
router.post('/:id/draw', controller.drawCard.bind(controller));

router.post('/:id/declare-uno', controller.declareUno.bind(controller));

router.post('/:id/challenge', controller.challengeUno.bind(controller));

router.delete('/:id', controller.deleteGame.bind(controller));

export default router;
