import express from 'express';
import CardController from '../controllers/card.controller.js';
import cardMiddleware from '../middlewares/card.middleware.js';

const router = express.Router();
const cardController = new CardController();

router.use(cardMiddleware.logRequest);

router.post('/', 
  cardMiddleware.validateCard,
  cardController.create
);

router.get('/',
  cardMiddleware.validateQueryParams,
  cardController.findAll
);

router.get('/:id',
  cardMiddleware.validateCardId,
  cardController.findById
);

router.put('/:id',
  cardMiddleware.validateCardId,
  cardMiddleware.validateCard,
  cardController.update
);

router.delete('/:id',
  cardMiddleware.validateCardId,
  cardController.delete
);

export default router;