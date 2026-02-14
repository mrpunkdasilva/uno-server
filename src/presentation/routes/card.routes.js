import express from 'express';
import CardController from '../controllers/card.controller.js';
import CardService from '../../core/services/card.service.js';
import CardRepository from '../../infra/repositories/card.repository.js';

import validateDto from '../middlewares/validateDto.middleware.js';

import createCardDto from '../dtos/createCard.dto.js';
import updateCardDto from '../dtos/updateCard.dto.js';

const router = express.Router();

const cardRepository = new CardRepository();
const cardService = new CardService(cardRepository);
const cardController = new CardController(cardService);

router.get('/', (req, res) => cardController.getAllCards(req, res));
router.post('/', validateDto(createCardDto), (req, res) =>
  cardController.createCard(req, res),
);
router.get('/count', (req, res) => cardController.countCards(req, res));
router.post('/game/:gameId/initialize', (req, res) =>
  cardController.initializeGameDeck(req, res),
);
router.get('/game/:gameId', (req, res) =>
  cardController.getCardsByGame(req, res),
);
router.post('/game/:gameId/draw', (req, res) =>
  cardController.drawCard(req, res),
);
router.get('/:id', (req, res) => cardController.getCardById(req, res));
router.put('/:id', validateDto(updateCardDto), (req, res) =>
  cardController.updateCard(req, res),
);
router.delete('/:id', (req, res) => cardController.deleteCard(req, res));
router.post('/:id/discard', (req, res) => cardController.discardCard(req, res));

export default router;
