import GameService from '../../core/services/game.service.js';
import getDiscardTopCardDtoSchema from '../dtos/getDiscartTopCard.dto.js';

/**
 * Controller class for handling game-related HTTP requests.
 * Manages game CRUD operations including creation, retrieval, updating, and deletion.
 * Provides RESTful API endpoints with proper error handling and response formatting.
 */
class GameController {
  /**
   * Initializes the GameController with a GameService instance.
   */
  constructor() {
    this.gameService = new GameService();
  }

  /**
   * Retrieves all games from the database.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status and games data or error message.
   */
  async getAllGames(req, res) {
    try {
      const games = await this.gameService.getAllGames();
      res.status(200).json({
        success: true,
        data: games,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Creates a new game with the provided game data.
   * @param {Object} req - Express request object containing game creation data in req.body and user ID in req.user.id.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status, message, and game_id or error message.
   */
  async createGame(req, res) {
    try {
      const userId = req.user.id;
      const game = await this.gameService.createGame(req.body, userId);
      res.status(201).json({
        message: 'Game created successfully',
        game_id: game.id,
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
      });
    }
  }

  /**
   * Retrieves a game by its ID.
   * @param {Object} req - Express request object containing game ID in params.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status and game data or error message.
   */
  async getGameById(req, res) {
    try {
      const game = await this.gameService.getGameById(req.params.id);
      res.status(200).json({
        success: true,
        data: game,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Updates an existing game with new data.
   * @param {Object} req - Express request object containing game ID in params and update data in body.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status and updated game data or error message.
   */
  async updateGame(req, res) {
    try {
      const updatedGame = await this.gameService.updateGame(
        req.params.id,
        req.body,
      );
      res.status(200).json({
        success: true,
        data: updatedGame,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Deletes a game by its ID.
   * @param {Object} req - Express request object containing game ID in params.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status and deletion message or error message.
   */
  async deleteGame(req, res) {
    try {
      await this.gameService.deleteGame(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Game deleted successfully',
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handles the request for a user to join a game.
   * @param {Object} req - Express request object containing user info and body.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status or error message.
   */
  async joinGame(req, res) {
    try {
      const userId = req.user.id;
      const gameId = req.params.id;
      const result = await this.gameService.joinGame(userId, gameId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      let status = 400;
      if (error.message === 'Game not found') status = 404;
      if (error.message === 'User is already in this game') status = 409;
      res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Starts a game if all conditions are met.
   * @param {Object} req - Express request object containing game ID in params and user ID in req.user.id.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status or error message.
   */
  async startGame(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const result = await this.gameService.startGame(userId, gameId);
      return res.status(200).json({
        success: true,
        message: 'Game started successfully',
        data: result,
      });
    } catch (error) {
      let status = 500;
      if (error.message === 'Game not found') {
        status = 404;
      } else if (error.message === 'Only the game creator can start the game') {
        status = 403;
      } else if (error.message === 'Game has already started') {
        status = 409;
      } else if (
        error.message.includes('players required to start') ||
        error.message === 'Not all players are ready'
      ) {
        status = 400;
      }
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Allow player to abandon an ongoing game.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status or error message.
   */
  async abandonGame(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      await this.gameService.abandonGame(userId, gameId);
      return res.status(200).json({
        success: true,
        message: 'You left the game',
      });
    } catch (error) {
      let status = 500;
      if (error.message === 'Game not found') {
        status = 404;
      } else if (error.message === 'You are not in this game') {
        status = 404;
      } else if (error.message === 'Cannot abandon now') {
        status = 400;
      }
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Set current player as ready for the game.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status or error message.
   */
  async setReady(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const result = await this.gameService.setPlayerReady(userId, gameId);
      return res.status(200).json({
        success: true,
        message: 'You are ready',
        data: result,
      });
    } catch (error) {
      let status = 500;
      if (error.message === 'Game not found') status = 404;
      if (error.message === 'You are not in this game') status = 404;
      if (error.message === 'Cannot ready now') status = 400;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Retrieves the current status of a game.
   * @param {Object} req - Express request object containing game ID in params.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with success status and game status data or error message.
   */
  async getGameStatus(req, res) {
    try {
      const { id } = req.params;
      const status = await this.gameService.getGameStatus(id);
      res.status(200).json({
        success: true,
        data: {
          status: status,
        },
      });
    } catch (error) {
      let statusCode = 500;
      let message = error.message;
      if (error.message === 'Invalid game ID') {
        statusCode = 400;
        message = 'Invalid game ID';
      } else if (error.message === 'Game not found') {
        statusCode = 404;
        message = 'Game not found';
      }
      res.status(statusCode).json({
        success: false,
        message: message,
      });
    }
  }

  /**
   * Get the top card from the discard pile.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Promise<void>} JSON response with discard top card data or error message.
   */
  async getDiscardTop(req, res, next) {
    try {
      const validatedData = getDiscardTopCardDtoSchema.parse({
        game_id: req.params.id || req.body.game_id,
      });
      const gameId = validatedData.game_id;
      const result = await this.gameService.getDiscardTop(gameId);
      if (result.error) {
        if (result.error === 'Game not found') {
          return res.status(404).json({
            error: 'Game not found',
          });
        }
        if (result.error === 'Game has not started yet') {
          return res.status(412).json({
            error: 'Game has not started yet',
            game_state: result.game_state || 'waiting',
            initial_card: result.initial_card,
          });
        }
        return res.status(400).json({
          error: result.error,
        });
      }
      return res.status(200).json(result);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid game ID',
          details: error.errors,
        });
      }
      if (error.message === 'Invalid game ID') {
        return res.status(400).json({
          error: 'Invalid game ID',
        });
      }
      if (error.message === 'Game not found') {
        return res.status(404).json({
          error: 'Game not found',
        });
      }
      return next(error);
    }
  }

  /**
   * Get the top card from the discard pile (simple response).
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Promise<void>} JSON response with simple discard top card data or error message.
   */
  async getDiscardTopSimple(req, res, next) {
    try {
      const validatedData = getDiscardTopCardDtoSchema.parse({
        game_id: req.params.id || req.body.game_id,
      });
      const gameId = validatedData.game_id;
      const result = await this.gameService.getDiscardTopSimple(gameId);
      if (result.error) {
        if (result.error === 'Game not found') {
          return res.status(404).json({
            error: 'Game not found',
          });
        }
        if (result.error === 'Game has not started yet') {
          return res.status(412).json({
            error: 'Game has not started yet',
            game_state: result.game_state || 'waiting',
            initial_card: result.initial_card,
          });
        }
        return res.status(400).json({
          error: result.error,
        });
      }
      return res.status(200).json(result);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid game ID',
          details: error.errors,
        });
      }
      if (error.message === 'Invalid game ID') {
        return res.status(400).json({
          error: 'Invalid game ID',
        });
      }
      if (error.message === 'Game not found') {
        return res.status(404).json({
          error: 'Game not found',
        });
      }
      return next(error);
    }
  }

  /**
   * Get recent cards from discard pile (with history).
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   * @returns {Promise<void>} JSON response with discard pile history or error message.
   */
  async getRecentDiscards(req, res, next) {
    try {
      const validatedData = getDiscardTopCardDtoSchema.parse({
        game_id: req.params.id || req.body.game_id,
      });
      const gameId = validatedData.game_id;
      const limit = parseInt(req.query.limit) || 10;
      const game = await this.gameService.gameRepository.findRecentDiscards(
        gameId,
        limit,
      );
      if (!game) {
        return res.status(404).json({
          error: 'Game not found',
        });
      }

      if (game.status === 'Waiting') {
        return res.status(412).json({
          error: 'Game has not started yet',
          game_state: 'waiting',
          initial_card: game.initialCard || {
            color: 'blue',
            value: '0',
            type: 'number',
          },
        });
      }
      const response = {
        game_id: gameId,
        discard_pile_size: game.discardPile?.length || 0,
      };
      if (game.discardPile && game.discardPile.length > 0) {
        const topCard = game.discardPile[game.discardPile.length - 1];
        response.current_top_card = {
          color: topCard.color,
          value: topCard.value,
          type: topCard.type,
          played_by: topCard.playedBy?.toString() || 'system',
        };
      }
      if (game.discardPile && game.discardPile.length > 0) {
        const recentCards = game.discardPile.slice(-limit).reverse();
        response.recent_cards = recentCards.map((card) => ({
          color: card.color,
          value: card.value,
          type: card.type,
          played_by: card.playedBy?.toString() || 'system',
        }));
      }
      return res.status(200).json(response);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid game ID',
          details: error.errors,
        });
      }
      if (error.message === 'Invalid game ID') {
        return res.status(400).json({
          error: 'Invalid game ID',
        });
      }
      if (error.message === 'Game not found') {
        return res.status(404).json({
          error: 'Game not found',
        });
      }

      return next(error);
    }
  }
}

export default GameController;
