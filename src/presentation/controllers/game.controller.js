import getDiscardTopCardDtoSchema from '../dtos/card/get-discard-top-card.dto.js';
import gameHistoryDtoSchema from '../dtos/game/game.history.dto.js';
import mongoose from 'mongoose';
import {
  GameNotFoundError,
  InvalidGameIdError,
  GameHasNotStartedError,
  GameAlreadyStartedError,
  NotGameCreatorError,
  MinimumPlayersRequiredError,
  NotAllPlayersReadyError,
  GameFullError,
  UserAlreadyInGameError,
  UserNotInGameError,
  CannotPerformActionError,
  GameNotAcceptingPlayersError,
} from '../../core/errors/game.errors.js';
import logger from '../../config/logger.js';
import * as GameDomain from '../../core/domain/game/index.js';

/**
 * Controller class for handling game-related HTTP requests.
 * Manages game CRUD operations including creation, retrieval, updating, and deletion.
 * Provides RESTful API endpoints with proper error handling and response formatting.
 */
class GameController {
  skipInfo;
  /**
   * Initializes the GameController with a GameService instance.
   * @param gameService
   * @param gameHistoryService
   */
  constructor(gameService, gameHistoryService) {
    this.gameService = gameService;
    this.gameHistoryService = gameHistoryService;
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
      if (error instanceof GameNotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
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
      if (error instanceof GameNotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof InvalidGameIdError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          details: error.errors,
        });
      }
      res.status(500).json({
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
      if (error instanceof GameNotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
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
      if (error instanceof GameNotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof GameNotAcceptingPlayersError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof GameFullError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof UserAlreadyInGameError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
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
      if (
        error instanceof GameNotFoundError ||
        error instanceof UserNotInGameError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (
        error instanceof NotGameCreatorError ||
        error instanceof GameAlreadyStartedError ||
        error instanceof MinimumPlayersRequiredError ||
        error instanceof NotAllPlayersReadyError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
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
      if (
        error instanceof GameNotFoundError ||
        error instanceof UserNotInGameError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof CannotPerformActionError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
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
      if (
        error instanceof GameNotFoundError ||
        error instanceof UserNotInGameError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof CannotPerformActionError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
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
      if (
        error instanceof InvalidGameIdError ||
        error instanceof GameNotFoundError
      ) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: error.message,
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

      return res.status(200).json(result);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid game ID',
          details: error.errors,
        });
      } else if (
        error instanceof InvalidGameIdError ||
        error instanceof GameNotFoundError
      ) {
        return res.status(error.statusCode).json({
          error: error.message,
        });
      } else if (error instanceof GameHasNotStartedError) {
        return res.status(error.statusCode).json({
          error: error.message,
          game_state: 'waiting',
          initial_card: error.initial_card,
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

      return res.status(200).json(result);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid game ID',
          details: error.errors,
        });
      } else if (
        error instanceof InvalidGameIdError ||
        error instanceof GameNotFoundError
      ) {
        return res.status(error.statusCode).json({
          error: error.message,
        });
      } else if (error instanceof GameHasNotStartedError) {
        return res.status(error.statusCode).json({
          error: error.message,
          game_state: 'waiting',
          initial_card: error.initial_card,
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
      const game = await this.gameService.getRecentDiscards(gameId, limit);

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
      } else if (
        error instanceof InvalidGameIdError ||
        error instanceof GameNotFoundError
      ) {
        return res.status(error.statusCode).json({
          error: error.message,
        });
      } else if (error instanceof GameHasNotStartedError) {
        return res.status(error.statusCode).json({
          error: error.message,
          game_state: 'waiting',
          initial_card: error.initial_card,
        });
      }
      return next(error);
    }
  }
  /**
   * Handles the request to end a game early.
   *
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>} JSON response with success status or error message.
   */
  async endGame(req, res) {
    try {
      const userId = req.user.id;
      const gameId = req.params.id;

      const result = await this.gameService.endGame(gameId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof GameNotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof NotGameCreatorError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof GameAlreadyStartedError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof CannotPerformActionError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Retrieves a player's hand of cards
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with player's hand
   */
  async getPlayerHand(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { player } = req.body;

      // Validate request body
      if (!player) {
        return res.status(400).json({
          success: false,
          message: 'Player ID is required in request body',
        });
      }

      const hand = await this.gameService.getPlayerHand(userId, gameId, player);

      res.status(200).json(hand);
    } catch (error) {
      if (error instanceof GameNotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error.message === 'You can only view your own cards') {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      } else if (error.message === 'Player has no cards in hand') {
        return res.status(200).json({
          player: req.body.player,
          hand: [],
        });
      }

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handles playing a card for a player
   * After playing, automatically advances to the next player's turn
   * @param {Object} req - Express request object containing gameId in params, cardId and optional chosenColor in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and message or error
   */
  async playCard(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const { cardId, chosenColor } = req.body;

      if (!mongoose.Types.ObjectId.isValid(gameId)) {
        throw new InvalidGameIdError();
      }

      if (!cardId) {
        return res.status(400).json({
          success: false,
          message: 'Card ID is required in request body',
        });
      }

      // Play the card
      const playResult = await this.gameService.playCard(
        gameId,
        userId,
        cardId,
        chosenColor,
      );

      // Check if the game ended (player won)
      const gameStatus = await this.gameService.getGameStatus(gameId);
      const gameEnded = gameStatus.status === 'Ended';

      let nextPlayerId = null;

      // Only advance turn if game didn't end
      if (!gameEnded) {
        nextPlayerId = await this.gameService.advanceTurn(gameId);

        // If this was a skip card and we have skip info in the playResult
        if (playResult.skipInfo) {
          this.skipInfo = playResult.skipInfo;
        }
      }

      // Format response based on whether it was a skip card
      const response = {
        success: true,
        message: playResult.message,
        turnAdvanced: !gameEnded,
        gameEnded: gameEnded,
        nextPlayer: nextPlayerId,
      };

      // Add skip-specific response format if applicable
      if (this.skipInfo) {
        // Transform to match the requested output format
        return res.status(200).json({
          status: 200,
          body: {
            nextPlayerIndex: this.skipInfo.nextPlayerIndex,
            nextPlayer: this.skipInfo.nextPlayer,
            skippedPlayer: this.skipInfo.skippedPlayer,
          },
        });
      }

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof GameNotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof InvalidGameIdError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof CannotPerformActionError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handles drawing a card from the deck for a player
   * After drawing, automatically advances to the next player's turn
   * @param {Object} req - Express request object containing gameId in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and drawn card or error
   */
  async drawCard(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;

      // Draw a card - this method will handle all validations including:
      // - Game exists and is active
      // - User is the current player
      // - Deck has cards available
      const drawResult = await this.gameService.drawCard(
        userId,
        gameId,
        userId,
      );

      // Automatically advance turn after drawing a card
      const nextPlayerId = await this.gameService.advanceTurn(gameId);

      res.status(200).json({
        success: true,
        message: 'Card drawn successfully',
        drawnCard: drawResult.card,
        turnAdvanced: true,
        nextPlayer: nextPlayerId,
      });
    } catch (error) {
      if (error instanceof GameNotFoundError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof InvalidGameIdError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else if (error instanceof CannotPerformActionError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message:
          error?.message || String(error) || 'An unexpected error occurred',
      });
    }
  }

  /**
   * Retrieves the action history for a specific game.
   *
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Parâmetros da rota
   * @param {string} req.params.gameId - ID do jogo
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.limit] - Limit of records to return
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {Promise<void>} Returns JSON with the game history
   * @throws {Error} If there is an error in validation or search
   */
  async getGameHistory(req, res) {
    try {
      logger.debug(
        {
          params: req.params,
          query: req.query,
        },
        'Getting game history',
      );

      const gameId = req.params.id;
      const { limit } = req.query;

      // Validar entrada com Zod
      const validated = gameHistoryDtoSchema.parse({
        gameId: gameId,
        limit,
      });

      logger.debug({ validated }, 'Validated history request');

      const history = await this.gameHistoryService.getGameHistory(
        validated.gameId,
        validated.limit,
      );

      logger.debug(
        { historyCount: history?.data?.length },
        'History retrieved successfully',
      );

      return res.status(200).json(history);
    } catch (error) {
      logger.error(
        {
          err: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            errors: error.errors,
          },
          gameId: req.params.id,
        },
        'Error getting game history',
      );

      throw error;
    }
  }

  /**
   * Handles the request to declare "UNO".
   *
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>} JSON response indicating success or error.
   */
  async declareUno(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const result = await this.gameService.declareUno(gameId, userId);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof GameNotFoundError) {
        return res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
      } else if (error instanceof CannotPerformActionError) {
        return res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Handles the request to challenge a player for not declaring "UNO".
   *
   * @param {Object} req - The express request object containing the targetPlayerId in the body.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>} JSON response with the challenge result or error.
   */
  async challengeUno(req, res) {
    try {
      const gameId = req.params.id;
      const challengerId = req.user.id;
      const { targetPlayerId } = req.body;

      if (!targetPlayerId) {
        return res.status(400).json({
          success: false,
          message: 'targetPlayerId is required in request body',
        });
      }

      const result = await this.gameService.challengeUno(
        gameId,
        challengerId,
        targetPlayerId,
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof GameNotFoundError) {
        return res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
      } else if (error instanceof CannotPerformActionError) {
        return res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Handles the request to fetch the complete and secure game state.
   *
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>} JSON response containing the game state snapshot.
   */
  async getFullGameState(req, res) {
    try {
      const gameId = req.params.id;
      const userId = req.user.id;
      const result = await this.gameService.getFullGameState(gameId, userId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (
        error instanceof GameNotFoundError ||
        error instanceof UserNotInGameError
      ) {
        return res
          .status(error.statusCode)
          .json({ success: false, message: error.message });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Calculates the next player's turn based on the current list of players and index.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @returns {Promise<void>} JSON response with next player info.
   */
  async nextTurn(req, res) {
    const { players, currentPlayerIndex } = req.body;

    if (!players || currentPlayerIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Players list and currentPlayerIndex are required',
      });
    }

    const nextTurnInfo = GameDomain.calculateNextTurn(
      players,
      currentPlayerIndex,
    );

    res.status(200).json(nextTurnInfo);
  }
}

export default GameController;
