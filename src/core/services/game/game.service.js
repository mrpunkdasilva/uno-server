import { Result, ResultAsync } from '../../utils/Result.js';
import { getStrategyForCard } from './card-strategies/strategy.factory.js';
import gameResponseDtoSchema from '../../../presentation/dtos/game/game-response.dto.js';
import updateGameDtoSchema from '../../../presentation/dtos/game/update-game.dto.js';
import createGameDtoSchema from '../../../presentation/dtos/game/create-game.dto.js';
import logger from '../../../config/logger.js';
import { colorMap, valueMap } from '../../enums/card.enum.js';
import {
  GameNotFoundError,
  InvalidGameIdError,
  GameNotActiveError,
  GameHasNotStartedError,
  UserNotInGameError,
  CannotPerformActionError,
  CouldNotDetermineCurrentPlayerError,
  GameNotAcceptingPlayersError,
  GameFullError,
  UserAlreadyInGameError,
  NotGameCreatorError,
  GameAlreadyStartedError,
  MinimumPlayersRequiredError,
  NotAllPlayersReadyError,
} from '../../errors/game.errors.js';
import {
  validateGameIsWaiting,
  validateGameNotFull,
  validateUserNotInGame,
  validateIsCreator,
  validateGameNotStarted,
  validateMinimumPlayers,
  validateAllPlayersReady,
  validateGameIsActive,
  validateUserInGame,
  validateGameHasPlayers,
} from '../../domain/game/game.validators.js';
import {
  addPlayer,
  markPlayerAsReady,
  startGame as startGameLogic,
  createInitialGame,
  createEndGamePayload,
  hasPlayerWon,
  buildJoinGameSuccessResponse,
  buildSetPlayerReadySuccessResponse,
  getCurrentPlayer as getCurrentPlayerFromGame,
  advanceTurn as advanceTurnLogic,
  buildAdvanceTurnSuccessResponse,
  removePlayerFromGame,
} from '../../domain/game/game.logic.js';
import {
  fetchAllAndMapToDto,
  fetchByIdAndMapToDto,
  updateAndMapToDto,
  deleteByIdAndReturn,
  fetchById,
  saveEntityAndReturnCustomResponse,
  saveAndMapToDto,
} from '../../utils/service.utils.js';

/**
 * Service class for handling game-related business logic.
 */
class GameService {
  /**
   * Initializes the GameService with a GameRepository instance.
   * @param gameRepository
   * @param playerRepository
   */
  constructor(gameRepository, playerRepository) {
    this.gameRepository = gameRepository;
    this.playerRepository = playerRepository;
  }

  /**
   * Retrieves all games from the database.
   * @returns {Promise<Array>} Array of all game objects.
   * @throws {Error} When database operation fails.
   */
  async getAllGames() {
    return fetchAllAndMapToDto(
      this.gameRepository,
      gameResponseDtoSchema,
      logger,
      'game',
    ).getOrThrow();
  }

  /**
   * Retrieves a game by its ID
   * @param {string} id - The ID of the game to retrieve
   * @returns {Promise<Object>} The game object if found
   * @throws {Error} When game is not found
   */
  async getGameById(id) {
    return fetchByIdAndMapToDto(
      this.gameRepository,
      id,
      gameResponseDtoSchema,
      logger,
      'game',
      new GameNotFoundError(),
    ).getOrThrow();
  }

  /**
   * Creates a new game with the provided game data.
   * @param {Object} gameData - The data for creating a new game.
   * @param {string} userId - The ID of the user creating the game.
   * @returns {Promise<Object>} The created game object formatted as response DTO.
   */
  async createGame(gameData, userId) {
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`Attempting to create a new game by user ID: ${userId}`);
        const validatedGameData = createGameDtoSchema.parse(gameData);
        const initialGame = createInitialGame(validatedGameData, userId);
        return await this.gameRepository.createGame(initialGame);
      }),
    )
      .tap((game) =>
        logger.info(`Game ${game._id} created successfully by user ${userId}.`),
      )
      .map((game) => gameResponseDtoSchema.parse(game))
      .tapError((error) =>
        logger.error(
          `Failed to create game by user ${userId}: ${error.message}`,
        ),
      )
      .getOrThrow();
  }

  /**
   * Updates an existing game with new data
   * @param {string} id - The ID of the game to update
   * @param {Object} updateData - The data to update the game with
   * @returns {Promise<Object>} The updated game object formatted as response DTO
   * @throws {Error} When game is not found or validation fails
   */
  async updateGame(id, updateData) {
    return updateAndMapToDto(
      this.gameRepository,
      id,
      updateData,
      updateGameDtoSchema,
      gameResponseDtoSchema,
      logger,
      'game',
      new GameNotFoundError(),
    ).getOrThrow();
  }

  /**
   * Deletes a game by its ID
   * @param {string} id - The ID of the game to delete
   * @returns {Promise<Object>} The deleted game object
   * @throws {Error} When game is not found
   */
  async deleteGame(id) {
    return deleteByIdAndReturn(
      this.gameRepository,
      id,
      logger,
      'game',
      new GameNotFoundError(),
    ).getOrThrow();
  }

  /**
   * Centralized method to end a game.
   * Updates game status, sets winner, and records end time.
   * @param {string} gameId - The ID of the game to end.
   * @param {string|null} winnerId - The ID of the player who won, or null if no winner (e.g., all abandoned).
   * @private
   */
  async _endGame(gameId, winnerId = null) {
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `Attempting to end game ${gameId} with winner ${winnerId}.`,
        );
        const updatePayload = createEndGamePayload(winnerId);
        return await this.gameRepository.update(gameId, updatePayload);
      }),
    )
      .tap(() =>
        logger.info(
          `Game ${gameId} successfully ended. Winner: ${
            winnerId || 'No specific winner'
          }.`,
        ),
      )
      .tapError((error) =>
        logger.error(`Failed to end game ${gameId}: ${error.message}`),
      )
      .getOrThrow();
  }

  /**
   * Checks if a player has won the game (zero cards in hand) and ends the game if so.
   * @param {string} gameId - The ID of the game.
   * @param {string} playerId - The ID of the player to check.
   * @returns {Promise<boolean>} True if the game ended, false otherwise.
   */
  async checkAndEndGameIfPlayerWins(gameId, playerId) {
    logger.info(
      `Checking if player ${playerId} has won game ${gameId} by emptying hand.`,
    );

    const handSizeResult = new ResultAsync(
      Result.fromAsync(() =>
        this.gameRepository.getPlayerHandSize(gameId, playerId),
      ),
    );

    return handSizeResult
      .chain(async (handSize) => {
        if (hasPlayerWon(handSize)) {
          logger.info(
            `Player ${playerId} has won game ${gameId}. Ending game.`,
          );
          await this._endGame(gameId, playerId);
          return Result.success(true);
        }
        return Result.success(false);
      })
      .tapError((error) =>
        logger.error(
          `Error checking for game end for player ${playerId} in game ${gameId}: ${error.message}`,
        ),
      )
      .getOrThrow();
  }

  /**
   * Allows a user to join an existing game if valid conditions are met.
   *
   * @param {string} userId - The ID of the user attempting to join.
   * @param {string} gameId - The ID of the game to join.
   * @returns {Promise<Object>} An object containing a success message and current game details.
   * @throws {Error} If the game is not found (404).
   * @throws {Error} If the game is not in 'Waiting' status (400).
   * @throws {Error} If the game has reached its maximum player capacity (400).
   * @throws {Error} If the user is already a participant in the game (409).
   */
  async joinGame(userId, gameId) {
    return fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameNotFoundError(),
    )
      .chain(validateGameIsWaiting)
      .chain(validateGameNotFull)
      .chain(validateUserNotInGame(userId))
      .map((game) => addPlayer(game, userId))
      .chain((game) =>
        saveEntityAndReturnCustomResponse(
          this.gameRepository,
          game,
          buildJoinGameSuccessResponse,
        ),
      )
      .tap(() =>
        logger.info(`User ${userId} successfully joined game ${gameId}.`),
      )
      .tapError((error) => {
        if (error instanceof GameNotFoundError) {
          logger.warn(
            `Join game failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error instanceof GameNotAcceptingPlayersError) {
          logger.warn(
            `Join game failed for user ${userId} in game ${gameId}: Game not in 'Waiting' status.`,
          );
        } else if (error instanceof GameFullError) {
          logger.warn(
            `Join game failed for user ${userId} in game ${gameId}: Game is full.`,
          );
        } else if (error instanceof UserAlreadyInGameError) {
          logger.warn(
            `Join game failed for user ${userId} in game ${gameId}: User already in this game.`,
          );
        } else {
          logger.error(
            `Failed for user ${userId} to join game ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Set the given player as ready for the game.
   *
   * @param {string} userId - The ID of the user setting ready.
   * @param {string} gameId - The ID of the game.
   * @returns {Promise<Object>} Object with success message and counts.
   */
  async setPlayerReady(userId, gameId) {
    return fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameNotFoundError(),
    )
      .chain(validateGameIsWaiting)
      .chain(validateUserInGame(userId))
      .map((game) => markPlayerAsReady(game, userId))
      .chain((game) =>
        saveEntityAndReturnCustomResponse(
          this.gameRepository,
          game,
          buildSetPlayerReadySuccessResponse,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameNotFoundError) {
          logger.warn(
            `Set player ready failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error instanceof GameNotAcceptingPlayersError) {
          logger.warn(
            `Set player ready failed for user ${userId} in game ${gameId}: Game not in 'Waiting' status.`,
          );
        } else if (error instanceof UserNotInGameError) {
          logger.warn(
            `Set player ready failed for user ${userId} in game ${gameId}: User not in this game.`,
          );
        } else {
          logger.error(
            `Failed for user ${userId} to set ready in game ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Starts a game.
   * @param {string} userId - The ID of the user starting the game.
   * @param {string} gameId - The ID of the game to start.
   * @returns {Promise<Object>} The started game object.
   */
  async startGame(userId, gameId) {
    return fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameNotFoundError(),
    )
      .chain(validateIsCreator(userId))
      .chain(validateGameNotStarted)
      .chain(validateMinimumPlayers)
      .chain(validateAllPlayersReady)
      .map((game) => startGameLogic(game))
      .chain((game) =>
        saveAndMapToDto(
          this.gameRepository,
          game,
          gameResponseDtoSchema,
          logger,
          `Game ${gameId} successfully started by user ${userId}.`,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameNotFoundError) {
          logger.warn(
            `Game start failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error instanceof NotGameCreatorError) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: ${error.message}`,
          );
        } else if (error instanceof GameAlreadyStartedError) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: Game already started.`,
          );
        } else if (error instanceof MinimumPlayersRequiredError) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: ${error.message}`,
          );
        } else if (error instanceof NotAllPlayersReadyError) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: Not all players are ready.`,
          );
        } else {
          logger.error(
            `Failed for user ${userId} to start game ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Retrieves the current player whose turn it is for a given game.
   *
   * @param {string} gameId - The ID of the game.
   * @returns {Promise<string>} The ID of the current player.
   * @throws {Error} If the game is not found, not active, or no players are in the game.
   */
  async getCurrentPlayer(gameId) {
    return fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameNotFoundError(),
    )
      .chain(validateGameIsActive)
      .chain(validateGameHasPlayers)
      .chain((game) => getCurrentPlayerFromGame(game))
      .tap((currentPlayer) =>
        logger.info(
          `Successfully retrieved current player ${currentPlayer._id} for game ${gameId}.`,
        ),
      )
      .map((currentPlayer) => currentPlayer._id.toString())
      .tapError((error) => {
        if (error instanceof GameNotFoundError) {
          logger.warn(
            `Current player retrieval failed: Game ${gameId} not found.`,
          );
        } else if (error instanceof GameNotActiveError) {
          logger.warn(
            `Current player retrieval failed for game ${gameId}: Game is not active.`,
          );
        } else if (error instanceof CannotPerformActionError) {
          logger.warn(
            `Current player retrieval failed for game ${gameId}: No players in the game.`,
          );
        } else if (error instanceof CouldNotDetermineCurrentPlayerError) {
          logger.error(
            `Current player retrieval failed for game ${gameId}: Invalid currentPlayerIndex.`,
          );
        } else {
          logger.error(
            `Failed to retrieve current player for game ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Advances the game turn to the next player based on current direction.
   *
   * @param {string} gameId - The ID of the game.
   * @returns {Promise<string>} The ID of the next current player.
   * @throws {Error} If the game is not found, not active, or no players are in the game.
   */
  async advanceTurn(gameId) {
    return fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameNotFoundError(),
    )
      .chain(validateGameIsActive)
      .chain(validateGameHasPlayers)
      .map(advanceTurnLogic)
      .chain((game) =>
        saveEntityAndReturnCustomResponse(
          this.gameRepository,
          game,
          buildAdvanceTurnSuccessResponse,
        ),
      )
      .tap((nextPlayerId) =>
        logger.info(
          `Turn advanced for game ${gameId}. Next player: ${nextPlayerId}.`,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameNotFoundError) {
          logger.warn(`Advance turn failed: Game ${gameId} not found.`);
        } else if (error instanceof GameNotActiveError) {
          logger.warn(
            `Advance turn failed for game ${gameId}: Game is not active.`,
          );
        } else if (error instanceof CannotPerformActionError) {
          logger.warn(
            `Advance turn failed for game ${gameId}: No players in the game.`,
          );
        } else {
          logger.error(
            `Failed to advance turn for game ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Allows a player to abandon an ongoing game.
   *
   * @param {string} userId - The ID of the user abandoning the game.
   * @param {string} gameId - The ID of the game to abandon.
   * @returns {Promise<Object>} An object indicating success and a message.
   * @throws {Error} If the game is not found, user is not in the game, or game cannot be abandoned.
   */
  async abandonGame(userId, gameId) {
    return fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameNotFoundError(),
    )
      .chain(validateUserInGame(userId))
      .chain(validateGameIsActive)
      .map((game) => removePlayerFromGame(game, userId))
      .chain(async (game) => {
        const remainingPlayers = game.players.length;
        if (remainingPlayers === 1) {
          const winnerId = game.players[0]._id;
          await this._endGame(gameId, winnerId);
          logger.info(
            `Game ${gameId} ended due to last player (${winnerId}) remaining after abandonment.`,
          );
        } else if (remainingPlayers === 0) {
          await this._endGame(gameId);
          logger.info(`Game ${gameId} ended as all players abandoned.`);
        } else {
          await this.gameRepository.save(game);
        }
        return Result.success({ success: true, message: 'You left the game' });
      })
      .tap(() =>
        logger.info(`User ${userId} successfully abandoned game ${gameId}.`),
      )
      .tapError((error) => {
        if (error instanceof GameNotFoundError) {
          logger.warn(
            `Abandon game failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error instanceof UserNotInGameError) {
          logger.warn(
            `Abandon game failed for user ${userId} in game ${gameId}: User not in this game.`,
          );
        } else if (error instanceof GameNotActiveError) {
          logger.warn(
            `Abandon game failed for user ${userId} in game ${gameId}: Game not in 'Active' status.`,
          );
        } else {
          logger.error(
            `Failed for user ${userId} to abandon game ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Retrieves the current status of a game.
   *
   * @param {string} id - The ID of the game to retrieve the status for.
   * @returns {Promise<string>} The status of the game ("Waiting", "Active", "Pause", "Ended").
   * @throws {Error} If the game ID is invalid or the game is not found.
   */
  async getGameStatus(id) {
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`Attempting to retrieve status for game ID: ${id}`);
        if (!id || typeof id !== 'string' || id.trim() === '') {
          throw new InvalidGameIdError();
        }

        const trimmedId = id.trim();
        const game = await this.gameRepository.findGameStatus(trimmedId);
        if (!game) {
          throw new GameNotFoundError();
        }
        return game;
      }),
    )
      .tap((game) =>
        logger.info(
          `Successfully retrieved status for game ID ${id.trim()}: ${
            game.status
          }`,
        ),
      )
      .map((game) => game.status)
      .tapError((error) => {
        if (error.message === 'Invalid game ID') {
          logger.warn(
            `Get game status failed: Invalid game ID provided - "${id}".`,
          );
        } else if (error.message === 'Game not found') {
          logger.warn(
            `Get game status failed: Game with ID ${id.trim()} not found.`,
          );
        } else {
          logger.error(
            `Failed to retrieve game status for ID ${id}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Get the top card from the discard pile
   * @param {string} gameId - The game ID
   * @returns {Promise<Object>} Top card information
   * @throws {Error} When game is not found or ID is invalid
   */
  async getDiscardTop(gameId) {
    const trimmedId = gameId.trim();

    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `Attempting to get top discard card for game ID: ${gameId}`,
        );
        if (!gameId || typeof gameId !== 'string' || trimmedId === '') {
          throw new InvalidGameIdError();
        }

        const game = await this.gameRepository.findDiscardTop(trimmedId);

        if (!game) {
          throw new GameNotFoundError();
        }

        if (game.status === 'Waiting') {
          logger.warn(
            `Get discard top for game ${trimmedId}: Game has not started yet.`,
          );
          throw new GameHasNotStartedError();
        }

        if (!game.discardPile || game.discardPile.length === 0) {
          logger.info(
            `Get discard top for game ${trimmedId}: Discard pile is empty.`,
          );

          return {
            game_id: trimmedId,
            top_card: null,
            message: 'Discard pile is empty - no cards have been played yet',
            discard_pile_size: 0,
            initial_card: game.initialCard || {
              color: 'blue',
              value: '0',
              type: 'number',
            },
          };
        }
        return game;
      }),
    )
      .map((gameOrSpecialResult) => {
        if (gameOrSpecialResult.top_card === null) {
          return gameOrSpecialResult;
        }

        const game = gameOrSpecialResult;
        const topCard = game.discardPile[game.discardPile.length - 1];
        logger.info(
          `Successfully retrieved top discard card for game ID ${trimmedId}.`,
        );

        const recentCards = game.discardPile.slice(-5).reverse();

        return {
          game_id: trimmedId,
          current_top_card: {
            card_id: topCard.cardId,
            color: topCard.color,
            value: topCard.value,
            type: topCard.type,
            played_by: topCard.playedBy?.toString() || 'system',
            played_at: topCard.playedAt,
            order: topCard.order,
          },
          recent_cards: recentCards.map((card) => ({
            color: card.color,
            value: card.value,
            type: card.type,
            played_by: card.playedBy?.toString() || 'system',
            order: card.order,
          })),
          discard_pile_size: game.discardPile.length,
        };
      })
      .tapError((error) => {
        if (error instanceof InvalidGameIdError) {
          logger.warn(
            `Get discard top failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameNotFoundError) {
          logger.warn(
            `Get discard top failed: Game with ID ${trimmedId} not found.`,
          );
        } else if (error instanceof GameHasNotStartedError) {
          logger.warn(
            `Get discard top failed: Game ${trimmedId} has not started yet.`,
          );
        } else {
          logger.error(
            `Failed to get discard top for game ID ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Get discard top with simple response (legacy support)
   * @param {string} gameId - The game ID
   * @returns {Promise<Object>} Simple top card response
   */
  async getDiscardTopSimple(gameId) {
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `Attempting to get simple top discard card for game ID: ${gameId}`,
        );

        const gameResult = await this.getDiscardTop(gameId);
        return gameResult;
      }),
    )
      .map((gameOrSpecialResult) => {
        if (gameOrSpecialResult.top_card === null) {
          logger.info(
            `Simple discard top for game ${gameId}: Discard pile is empty.`,
          );
          return {
            game_ids: [gameOrSpecialResult.game_id],
            top_cards: [],
          };
        }

        const card = gameOrSpecialResult.current_top_card;
        const color = colorMap[card.color] || card.color;
        const value = valueMap[card.value] || card.value;
        const cardName = `${color} ${value}`;

        logger.info(
          `Successfully retrieved simple top discard card for game ID ${gameId}.`,
        );
        return {
          game_ids: [gameOrSpecialResult.game_id],
          top_cards: [cardName],
        };
      })
      .tapError((error) =>
        logger.error(
          `Failed to get simple discard top for game ID ${gameId}: ${error.message}`,
        ),
      )
      .getOrThrow();
  }

  /**
   * Retrieves the list of players in a specific game
   * @param {string} gameId - The ID of the game
   * @returns {Promise<Object>} Object containing game info and player list
   * @throws {Error} When game is not found or ID is invalid
   */
  async getGamePlayers(gameId) {
    const trimmedId = gameId.trim();

    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`Attempting to get players for game ID: ${gameId}`);
        if (!gameId || typeof gameId !== 'string' || trimmedId === '') {
          throw new InvalidGameIdError();
        }

        const game = await this.gameRepository.findById(trimmedId);

        if (!game) {
          throw new GameNotFoundError();
        }
        return game;
      }),
    )
      .chain(async (game) => {
        const playersWithDetails = await Promise.all(
          game.players.map(async (player) => {
            try {
              const playerDetails = await this.playerRepository.findById(
                player._id.toString(),
              );
              return {
                id: player._id.toString(),
                username: playerDetails?.username || 'Unknown',
                email: playerDetails?.email || 'unknown@example.com',
                ready: player.ready,
                position: player.position,
              };
            } catch (error) {
              logger.warn(
                `Failed to fetch details for player ${player._id}: ${error.message}`,
              );
              return {
                id: player._id.toString(),
                username: 'Unknown',
                email: 'unknown@example.com',
                ready: player.ready,
                position: player.position,
              };
            }
          }),
        );

        logger.info(
          `Successfully retrieved ${playersWithDetails.length} players for game ID ${trimmedId}.`,
        );

        return Result.success({
          gameId: trimmedId,
          gameTitle: game.title,
          gameStatus: game.status,
          totalPlayers: playersWithDetails.length,
          maxPlayers: game.maxPlayers,
          players: playersWithDetails,
        });
      })
      .tapError((error) => {
        if (error.message === 'Invalid game ID') {
          logger.warn(
            `Get game players failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error.message === 'Game not found') {
          logger.warn(
            `Get game players failed: Game with ID ${trimmedId} not found.`,
          );
        } else {
          logger.error(
            `Failed to get players for game ID ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Retrieves recent cards from the discard pile for a specific game.
   *
   * @param {string} gameId - The ID of the game.
   * @param {number} limit - The maximum number of recent cards to retrieve.
   * @returns {Promise<Object>} The game object containing recent discards.
   * @throws {Error} If the game is not found or ID is invalid.
   */
  async getRecentDiscards(gameId, limit) {
    const trimmedId = gameId.trim();

    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `Attempting to retrieve recent discards for game ID: ${trimmedId} with limit: ${limit}`,
        );
        if (!gameId || typeof gameId !== 'string' || trimmedId === '') {
          throw new InvalidGameIdError();
        }

        const game = await this.gameRepository.findRecentDiscards(
          trimmedId,
          limit,
        );
        if (!game) {
          throw new GameNotFoundError();
        }
        return game;
      }),
    )
      .tap(() =>
        logger.info(
          `Successfully retrieved recent discards for game ID ${trimmedId}.`,
        ),
      )
      .tapError((error) => {
        if (error.message === 'Invalid game ID') {
          logger.warn(
            `Get recent discards failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error.message === 'Game not found') {
          logger.warn(
            `Get recent discards failed: Game with ID ${trimmedId} not found.`,
          );
        } else {
          logger.error(
            `Failed to get recent discards for game ID ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Processes a player's move to play a card.
   * @param {string} gameId - The ID of the game.
   * @param {string} playerId - The ID of the player making the move.
   * @param {string} cardId - The ID of the card being played from the player's hand.
   * @param {string|null} [chosenColor=null] - The color chosen by the player, required for Wild cards.
   * @returns {Promise<Object>} The result of the action.
   */
  async playCard(gameId, playerId, cardId, chosenColor = null) {
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `Player ${playerId} attempting to play card ${cardId} in game ${gameId}.`,
        );

        const _game = await this.gameRepository.findById(gameId);
        if (!_game) throw new GameNotFoundError();
        if (_game.status !== 'Active') throw new GameNotActiveError();

        const currentPlayer = _game.players[_game.currentPlayerIndex];
        if (currentPlayer._id.toString() !== playerId) {
          throw new CannotPerformActionError('It is not your turn.');
        }

        const cardIndex = currentPlayer.hand.findIndex(
          (c) => c.cardId === cardId,
        );
        if (cardIndex === -1) {
          throw new CannotPerformActionError('Card not in your hand.');
        }

        const cardToPlay = currentPlayer.hand[cardIndex];

        const StrategyClass = getStrategyForCard(cardToPlay);
        const strategy = new StrategyClass();
        const gameContext = { game: _game, card: cardToPlay, chosenColor };

        if (!strategy.canExecute(gameContext)) {
          throw new CannotPerformActionError(
            'Invalid action for this card (e.g., missing color for Wild).',
          );
        }

        strategy.execute(gameContext);

        currentPlayer.hand.splice(cardIndex, 1);
        _game.discardPile.push(cardToPlay);

        if (currentPlayer.hand.length === 0) {
          await this._endGame(gameId, playerId);
          await this.gameRepository.save(_game);
          logger.info(`Player ${playerId} has won game ${gameId}!`);
          return {
            success: true,
            message: 'You played your last card and won!',
          };
        }

        await this.gameRepository.save(_game);
        return { success: true, message: `Card played successfully.` };
      }),
    ).getOrThrow();
  }
}

export default GameService;
