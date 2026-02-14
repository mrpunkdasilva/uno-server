import { Result, ResultAsync } from '../../utils/Result.js';
import { getStrategyForCard } from './card-strategies/strategy.factory.js';
import gameResponseDtoSchema from '../../../presentation/dtos/game/game-response.dto.js';
import updateGameDtoSchema from '../../../presentation/dtos/game/update-game.dto.js';
import createGameDtoSchema from '../../../presentation/dtos/game/create-game.dto.js';
import logger from '../../../config/logger.js';
import { colorMap, valueMap } from '../../enums/card.enum.js';
import {
  CannotPerformActionError,
  CouldNotDetermineCurrentPlayerError,
  GameAlreadyStartedError,
  GameFullError,
  GameHasNotStartedError,
  GameNotAcceptingPlayersError,
  GameNotActiveError,
  GameNotFoundError,
  InvalidGameIdError,
  MinimumPlayersRequiredError,
  NotAllPlayersReadyError,
  NotGameCreatorError,
  UserAlreadyInGameError,
  UserNotInGameError,
} from '../../errors/game.errors.js';
import {
  validateAllPlayersReady,
  validateGameHasPlayers,
  validateGameHasStarted,
  validateGameId,
  validateGameIsActive,
  validateGameIsWaiting,
  validateGameNotFull,
  validateGameNotStarted,
  validateIsCreator,
  validateMinimumPlayers,
  validateUserInGame,
  validateUserNotInGame,
} from '../../domain/game/game.validators.js';
import {
  abandonGame as abandonGameLogic,
  addPlayer,
  advanceTurn as advanceTurnLogic,
  buildAbandonGameSuccessResponse,
  buildAdvanceTurnSuccessResponse,
  buildGetDiscardTopResponse,
  buildDiscardTopSimpleResponse,
  buildGamePlayersResponse,
  buildPlayerDetails,
  buildJoinGameSuccessResponse,
  buildSetPlayerReadySuccessResponse,
  createEndGamePayload,
  createInitialGame,
  getCurrentPlayer as getCurrentPlayerFromGame,
  hasPlayerWon,
  markPlayerAsReady,
  startGame as startGameLogic,
} from '../../domain/game/game.logic.js';
import {
  deleteByIdAndReturn,
  fetchAllAndMapToDto,
  fetchById,
  fetchByIdAndMapToDto,
  fetchWithCustomQuery,
  saveAndMapToDto,
  saveEntityAndReturnCustomResponse,
  updateAndMapToDto,
} from '../../utils/service.utils.js';

import { PostAbandonmentActionExecutor } from './executors/PostAbandonmentActionExecutor.js';

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
    this.postAbandonmentActionExecutor = new PostAbandonmentActionExecutor(
      this,
    );
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
      .chain(async (game) => {
        const { action, winnerId } = abandonGameLogic(game, userId);

        await this.postAbandonmentActionExecutor.execute(action, {
          game,
          gameId,
          winnerId,
        });

        return Result.success(buildAbandonGameSuccessResponse());
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
    return new ResultAsync(validateGameId(id))
      .tap((trimmedId) =>
        logger.info(`Attempting to retrieve status for game ID: ${trimmedId}`),
      )
      .chain(async (trimmedId) => {
        const game = await this.gameRepository.findGameStatus(trimmedId);
        return game
          ? Result.success(game)
          : Result.failure(new GameNotFoundError());
      })
      .tap((game) =>
        logger.info(
          `Successfully retrieved status for game ID ${game._id}: ${game.status}`,
        ),
      )
      .map((game) => game.status)
      .tapError((error) => {
        if (error instanceof InvalidGameIdError) {
          logger.warn(
            `Get game status failed: Invalid game ID provided - "${id}".`,
          );
        } else if (error instanceof GameNotFoundError) {
          const gameId = id ? id.trim() : id;
          logger.warn(
            `Get game status failed: Game with ID ${gameId} not found.`,
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
    return new ResultAsync(validateGameId(gameId))
      .tap((trimmedId) =>
        logger.info(
          `Attempting to get top discard card for game ID: ${trimmedId}`,
        ),
      )
      .chain(async (trimmedId) => {
        const game = await this.gameRepository.findDiscardTop(trimmedId);
        return game
          ? Result.success(game)
          : Result.failure(new GameNotFoundError());
      })
      .chain(validateGameHasStarted)
      .map(buildGetDiscardTopResponse)
      .tap((response) => {
        if (response.top_card === null) {
          logger.info(
            `Get discard top for game ${response.game_id}: Discard pile is empty.`,
          );
        } else {
          logger.info(
            `Successfully retrieved top discard card for game ID ${response.game_id}.`,
          );
        }
      })
      .tapError((error) => {
        if (error instanceof InvalidGameIdError) {
          logger.warn(
            `Get discard top failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameNotFoundError) {
          const idToLog = gameId ? gameId.trim() : gameId;
          logger.warn(
            `Get discard top failed: Game with ID ${idToLog} not found.`,
          );
        } else if (error instanceof GameHasNotStartedError) {
          const idToLog = gameId ? gameId.trim() : gameId;
          logger.warn(
            `Get discard top failed: Game ${idToLog} has not started yet.`,
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

        return await this.getDiscardTop(gameId);
      }),
    )
      .map(buildDiscardTopSimpleResponse)
      .tap((response) => {
        if (response.top_cards.length === 0) {
          logger.info(
            `Simple discard top for game ${response.game_ids[0]}: Discard pile is empty.`,
          );
        } else {
          logger.info(
            `Successfully retrieved simple top discard card for game ID ${response.game_ids[0]}.`,
          );
        }
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
    return new ResultAsync(validateGameId(gameId))
      .tap((trimmedId) =>
        logger.info(`Attempting to get players for game ID: ${trimmedId}`),
      )
      .chain((trimmedId) =>
        fetchById(
          this.gameRepository,
          trimmedId,
          logger,
          'game',
          new GameNotFoundError(),
        ),
      )
      .chain(async (game) => {
        const playersWithDetails = await this._getPlayersWithDetails(game);

        logger.info(
          `Successfully retrieved ${playersWithDetails.length} players for game ID ${game._id}.`,
        );

        return Result.success(
          buildGamePlayersResponse(game, playersWithDetails),
        );
      })
      .tapError((error) => {
        if (error instanceof InvalidGameIdError) {
          logger.warn(
            `Get game players failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameNotFoundError) {
          const idToLog = gameId ? gameId.trim() : gameId;
          logger.warn(
            `Get game players failed: Game with ID ${idToLog} not found.`,
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
   * Fetches detailed information for each player in the game.
   * @param {object} game - The game object containing player IDs.
   * @returns {Promise<Array<object>>} An array of player objects with enriched details.
   * @private
   */
  async _getPlayersWithDetails(game) {
    return Promise.all(
      game.players.map(async (player) => {
        let playerDetails = null;
        try {
          playerDetails = await this.playerRepository.findById(
            player._id.toString(),
          );
        } catch (error) {
          logger.warn(
            `Failed to fetch details for player ${player._id}: ${error.message}`,
          );
        }
        return buildPlayerDetails(player, playerDetails);
      }),
    );
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
    return new ResultAsync(validateGameId(gameId)) // Validate first
      .chain((trimmedId) =>
        fetchWithCustomQuery({
          queryFn: () => this.gameRepository.findRecentDiscards(trimmedId, limit),
          logger,
          logMessage: `Attempting to retrieve recent discards for game ID: ${trimmedId} with limit: ${limit}`,
          notFoundError: new GameNotFoundError(),
        }),
      )
      .tap((game) =>
        logger.info(
          `Successfully retrieved recent discards for game ID ${game._id}.`,
        ),
      )
      .tapError((error) => {
        if (error instanceof InvalidGameIdError) {
          logger.warn(
            `Get recent discards failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameNotFoundError) {
          const idToLog = gameId ? gameId.trim() : gameId;
          logger.warn(
            `Get recent discards failed: Game with ID ${idToLog} not found.`,
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
