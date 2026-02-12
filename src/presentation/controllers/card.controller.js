/**
 * Controller class for handling card-related HTTP requests.
 * Manages card CRUD operations including creation, retrieval, updating, and deletion.
 */
class CardController {
  /**
   * Initializes the CardController with a CardService instance.
   * @param {CardService} cardService - The CardService instance to use for card operations.
   */
  constructor(cardService) {
    this.cardService = cardService;
  }

  /**
   * Retrieves all cards from the database with optional filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and cards data or error message
   */
  async getAllCards(req, res) {
    try {
      const filters = {};

      if (req.query.color) filters.color = req.query.color;
      if (req.query.type) filters.type = req.query.type;
      if (req.query.gameId) filters.gameId = req.query.gameId;
      if (req.query.playerId) filters.playerId = req.query.playerId;
      if (req.query.isInDeck !== undefined) {
        filters.isInDeck = req.query.isInDeck === 'true';
      }
      if (req.query.isDiscarded !== undefined) {
        filters.isDiscarded = req.query.isDiscarded === 'true';
      }
      if (req.query.sortBy) filters.sortBy = req.query.sortBy;
      if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder;
      if (req.query.limit) filters.limit = req.query.limit;
      if (req.query.skip) filters.skip = req.query.skip;

      const cards = await this.cardService.findAll(filters);
      res.status(200).json({
        success: true,
        data: cards,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Creates a new card with the provided card data
   * @param {Object} req - Express request object containing card creation data in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and created card data or error message
   */
  async createCard(req, res) {
    try {
      const card = await this.cardService.create(req.body);
      res.status(201).json({
        success: true,
        data: card,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Retrieves a card by their ID
   * @param {Object} req - Express request object containing card ID in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and card data or error message
   */
  async getCardById(req, res) {
    try {
      const card = await this.cardService.findById(req.params.id);
      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Updates an existing card with new data
   * @param {Object} req - Express request object containing card ID in params and update data in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and updated card data or error message
   */
  async updateCard(req, res) {
    try {
      const card = await this.cardService.update(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Deletes a card by their ID
   * @param {Object} req - Express request object containing card ID in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and deletion message or error message
   */
  async deleteCard(req, res) {
    try {
      await this.cardService.delete(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Card deleted successfully',
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Initializes a game deck with standard UNO cards
   * @param {Object} req - Express request object containing gameId in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and created cards or error message
   */
  async initializeGameDeck(req, res) {
    try {
      const { gameId } = req.params;
      if (!gameId) {
        return res.status(400).json({
          success: false,
          message: 'gameId is required',
        });
      }
      const cards = await this.cardService.initializeGameDeck(gameId);
      res.status(201).json({
        success: true,
        data: cards,
        message: `Initialized deck with ${cards.length} cards`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Gets cards for a specific game
   * @param {Object} req - Express request object containing gameId in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and cards data or error message
   */
  async getCardsByGame(req, res) {
    try {
      const { gameId } = req.params;
      if (!gameId) {
        return res.status(400).json({
          success: false,
          message: 'gameId is required',
        });
      }

      const filters = {};
      if (req.query.isInDeck !== undefined) {
        filters.isInDeck = req.query.isInDeck === 'true';
      }
      if (req.query.isDiscarded !== undefined) {
        filters.isDiscarded = req.query.isDiscarded === 'true';
      }
      if (req.query.playerId) filters.playerId = req.query.playerId;
      if (req.query.sortBy) filters.sortBy = req.query.sortBy;
      if (req.query.sortOrder) filters.sortOrder = req.query.sortOrder;

      const cards = await this.cardService.getCardsByGame(gameId, filters);
      res.status(200).json({
        success: true,
        data: cards,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Draws a card from the deck for a specific game
   * @param {Object} req - Express request object containing gameId in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and drawn card or error message
   */
  async drawCard(req, res) {
    try {
      const { gameId } = req.params;
      if (!gameId) {
        return res.status(400).json({
          success: false,
          message: 'gameId is required',
        });
      }
      const card = await this.cardService.drawCard(gameId);
      res.status(200).json({
        success: true,
        data: card,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Discards a card
   * @param {Object} req - Express request object containing cardId in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and discarded card or error message
   */
  async discardCard(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Card ID is required',
        });
      }
      const card = await this.cardService.discardCard(id);
      res.status(200).json({
        success: true,
        data: card,
        message: 'Card discarded successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Counts cards matching filters
   * @param {Object} req - Express request object with optional query filters
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and card count or error message
   */
  async countCards(req, res) {
    try {
      const filters = {};

      if (req.query.color) filters.color = req.query.color;
      if (req.query.type) filters.type = req.query.type;
      if (req.query.gameId) filters.gameId = req.query.gameId;
      if (req.query.playerId) filters.playerId = req.query.playerId;

      const count = await this.cardService.countCards(filters);
      res.status(200).json({
        success: true,
        data: {
          count,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default CardController;
