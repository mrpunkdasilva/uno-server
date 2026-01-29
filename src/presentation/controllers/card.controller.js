import CardService from '../../core/services/card.service.js';

/**
 *
 */
class CardController {
  /**
   *
   */
  constructor() {
    this.cardService = new CardService();
  }

  create = async (req, res) => {
    try {
      const { color, value, gameId } = req.body;
      const cardData = { color, value, gameId };
      const card = await this.cardService.create(cardData);

      return res.status(201).json(card);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };

  findById = async (req, res) => {
    try {
      const { id } = req.params;
      const card = await this.cardService.findById(id);

      if (!card) {
        return res.status(404).json({
          error: 'Card not found',
        });
      }

      return res.status(200).json(card);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };

  update = async (req, res) => {
    try {
      const { id } = req.params;
      const { color, value, gameId } = req.body;
      const cardData = { color, value, gameId };
      const updatedCard = await this.cardService.update(id, cardData);

      if (!updatedCard) {
        return res.status(404).json({
          error: 'Card not found',
        });
      }

      return res.status(200).json(updatedCard);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };

  delete = async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await this.cardService.delete(id);

      if (!deleted) {
        return res.status(404).json({
          error: 'Card not found',
        });
      }

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };

  findAll = async (req, res) => {
    try {
      const { color, gameId, value, limit } = req.query;
      const filters = {};

      if (color) filters.color = color;
      if (gameId) filters.gameId = gameId;
      if (value) filters.value = value;
      if (limit) filters.limit = limit;

      const cards = await this.cardService.findAll(filters);
      return res.status(200).json(cards);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };
}

export default CardController;
