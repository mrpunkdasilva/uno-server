import { Router } from 'express';
import ScoreController from '../controllers/score.controller.js';
import validateDto from '../middlewares/validateDto.middleware.js';
import createScoreDtoSchema from '../dtos/score/create-score.dto.js';
import updateScoreDtoSchema from '../dtos/score/update-score.dto.js';
import ScoreService from '../../core/services/score.service.js';
import ScoreRepository from '../../infra/repositories/score.repository.js';

const router = Router();
const scoreRepository = new ScoreRepository();
const scoreService = new ScoreService(scoreRepository);
const scoreController = new ScoreController(scoreService);

router.post(
  '/',
  validateDto(createScoreDtoSchema),
  scoreController.createScore.bind(scoreController),
);

router.get('/', scoreController.getAllScores.bind(scoreController));

router.get(
  '/match/:matchId',
  scoreController.getMatchScores.bind(scoreController),
);

/**
 * ADDED ROUTE
 * Retrieves raw scores for a specific match without formatting.
 * This supports the requirement:
 * "Filtro por partida retorna scores da partida (200)"
 */
router.get(
  '/match/:matchId/raw',
  scoreController.getMatchScores.bind(scoreController), // FIXED: method name
);

router.put(
  '/:id',
  validateDto(updateScoreDtoSchema),
  scoreController.updateScore.bind(scoreController),
);

router.delete('/:id', scoreController.deleteScore.bind(scoreController));

export default router;
