import { Router } from 'express';
import ScoreController from '../controllers/score.controller.js';
import { validateDto } from '../middlewares/validateDto.middleware.js';
import createScoreDtoSchema from '../dtos/createScore.dto.js';

const router = Router();
const scoreController = new ScoreController();

router.post(
  '/',
  validateDto(createScoreDtoSchema),
  scoreController.createScore.bind(scoreController),
);

router.get('/', scoreController.getAllScores.bind(scoreController));

export default router;
