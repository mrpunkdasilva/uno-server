import * as CommonUtils from '../../utils/index.js';

import * as GameDtos from '../../../presentation/dtos/game/index.js';

import logger from '../../../config/logger.js';

import * as GameErrors from '../../errors/index.js';

import * as GameDomain from '../../domain/game/index.js';

import {
  PostAbandonmentActionExecutor,
  PostPlayOutcomeExecutor,
} from './executors/index.js';

import { CardPlayCoordinator } from './coordinators/index.js';

import ScoreService from '../score.service.js';

/**
 * Service class for handling game-related business logic.
 */
class GameService {
  /**
   * Initializes the GameService with a GameRepository instance.
   * @param gameRepository
   * @param playerRepository
   * @param scoreService
   */
  constructor(gameRepository, playerRepository, scoreService = null) {
    this.gameRepository = gameRepository;
    this.playerRepository = playerRepository;
    this.scoreService = scoreService || new ScoreService();
    this.postAbandonmentActionExecutor = new PostAbandonmentActionExecutor(
      this,
    );
    this.postPlayOutcomeExecutor = new PostPlayOutcomeExecutor(this);
    this.cardPlayCoordinator = new CardPlayCoordinator(this, logger);
  }

  /**
   * Retrieves all games from the database.
   * @returns {Promise<Array>} Array of all game objects.
   * @throws {Error} When database operation fails.
   */
  async getAllGames() {
    return CommonUtils.fetchAllAndMapToDto(
      this.gameRepository,
      GameDtos.gameResponseDtoSchema,
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
    return CommonUtils.fetchByIdAndMapToDto(
      this.gameRepository,
      id,
      GameDtos.gameResponseDtoSchema,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
    ).getOrThrow();
  }

  /**
   * Creates a new game with the provided game data.
   * @param {Object} gameData - The data for creating a new game.
   * @param {string} userId - The ID of the user creating the game.
   * @returns {Promise<Object>} The created game object formatted as response DTO.
   */
  async createGame(gameData, userId) {
    return new CommonUtils.ResultAsync(
      CommonUtils.Result.fromAsync(async () => {
        logger.info(`Attempting to create a new game by user ID: ${userId}`);
        const validatedGameData = GameDtos.createGameDtoSchema.parse(gameData);
        const initialGame = GameDomain.createInitialGame(
          validatedGameData,
          userId,
        );
        return await this.gameRepository.createGame(initialGame);
      }),
    )
      .tap((game) =>
        logger.info(`Game ${game._id} created successfully by user ${userId}.`),
      )
      .map((game) => GameDtos.gameResponseDtoSchema.parse(game))
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
    return CommonUtils.updateAndMapToDto(
      this.gameRepository,
      id,
      updateData,
      GameDtos.updateGameDtoSchema,
      GameDtos.gameResponseDtoSchema,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
    ).getOrThrow();
  }

  /**
   * Deletes a game by its ID
   * @param {string} id - The ID of the game to delete
   * @returns {Promise<Object>} The deleted game object
   * @throws {Error} When game is not found
   */
  async deleteGame(id) {
    return CommonUtils.deleteByIdAndReturn(
      this.gameRepository,
      id,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
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
    return new CommonUtils.ResultAsync(
      CommonUtils.Result.fromAsync(async () => {
        logger.info(
          `Attempting to end game ${gameId} with winner ${winnerId}.`,
        );

        // Calculate and save score if there's a winner
        if (winnerId) {
          try {
            const game = await this.gameRepository.findById(gameId);
            if (game) {
              // Use ScoreService to calculate and create score
              const scoreResult =
                await this.scoreService.calculateAndCreateScore(
                  game,
                  winnerId,
                  gameId,
                );

              if (scoreResult.isFailure()) {
                // Log error but don't fail the game ending
                logger.error(
                  `Failed to calculate/save score for game ${gameId}: ${scoreResult.error.message}`,
                );
              }
            }
          } catch (scoreError) {
            // Log error but don't fail the game ending
            logger.error(
              `Failed to calculate/save score for game ${gameId}: ${scoreError.message}`,
            );
          }
        }

        const updatePayload = GameDomain.createEndGamePayload(winnerId);
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

    const handSizeResult = new CommonUtils.ResultAsync(
      CommonUtils.Result.fromAsync(() =>
        this.gameRepository.getPlayerHandSize(gameId, playerId),
      ),
    );

    return handSizeResult
      .chain(async (handSize) => {
        if (GameDomain.hasPlayerWon(handSize)) {
          logger.info(
            `Player ${playerId} has won game ${gameId}. Ending game.`,
          );
          await this._endGame(gameId, playerId);
          return CommonUtils.Result.success(true);
        }
        return CommonUtils.Result.success(false);
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
    return CommonUtils.fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
    )
      .chain(GameDomain.validateGameIsWaiting)
      .chain(GameDomain.validateGameNotFull)
      .chain(GameDomain.validateUserNotInGame(userId))
      .map((game) => GameDomain.addPlayer(game, userId))
      .chain((game) =>
        CommonUtils.saveEntityAndReturnCustomResponse(
          this.gameRepository,
          game,
          GameDomain.buildJoinGameSuccessResponse,
        ),
      )
      .tap(() =>
        logger.info(`User ${userId} successfully joined game ${gameId}.`),
      )
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(
            `Join game failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error instanceof GameErrors.GameNotAcceptingPlayersError) {
          logger.warn(
            `Join game failed for user ${userId} in game ${gameId}: Game not in 'Waiting' status.`,
          );
        } else if (error instanceof GameErrors.GameFullError) {
          logger.warn(
            `Join game failed for user ${userId} in game ${gameId}: Game is full.`,
          );
        } else if (error instanceof GameErrors.UserAlreadyInGameError) {
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
    return CommonUtils.fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
    )
      .chain(GameDomain.validateGameIsWaiting)
      .chain(GameDomain.validateUserInGame(userId))
      .map((game) => GameDomain.markPlayerAsReady(game, userId))
      .chain((game) =>
        CommonUtils.saveEntityAndReturnCustomResponse(
          this.gameRepository,
          game,
          GameDomain.buildSetPlayerReadySuccessResponse,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(
            `Set player ready failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error instanceof GameErrors.GameNotAcceptingPlayersError) {
          logger.warn(
            `Set player ready failed for user ${userId} in game ${gameId}: Game not in 'Waiting' status.`,
          );
        } else if (error instanceof GameErrors.UserNotInGameError) {
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
    return CommonUtils.fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
    )
      .chain(GameDomain.validateIsCreator(userId))
      .chain(GameDomain.validateGameNotStarted)
      .chain(GameDomain.validateMinimumPlayers)
      .chain(GameDomain.validateAllPlayersReady)
      .map((game) => GameDomain.startGame(game))
      .chain((game) =>
        CommonUtils.saveAndMapToDto(
          this.gameRepository,
          game,
          GameDtos.gameResponseDtoSchema,
          logger,
          `Game ${gameId} successfully started by user ${userId}.`,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(
            `Game start failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error instanceof GameErrors.NotGameCreatorError) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: ${error.message}`,
          );
        } else if (error instanceof GameErrors.GameAlreadyStartedError) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: Game already started.`,
          );
        } else if (error instanceof GameErrors.MinimumPlayersRequiredError) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: ${error.message}`,
          );
        } else if (error instanceof GameErrors.NotAllPlayersReadyError) {
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
    return CommonUtils.fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
    )
      .chain(GameDomain.validateGameIsActive)
      .chain(GameDomain.validateGameHasPlayers)
      .chain((game) => GameDomain.getCurrentPlayer(game))
      .tap((currentPlayer) =>
        logger.info(
          `Successfully retrieved current player ${currentPlayer._id} for game ${gameId}.`,
        ),
      )
      .map((currentPlayer) => currentPlayer._id.toString())
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(
            `Current player retrieval failed: Game ${gameId} not found.`,
          );
        } else if (error instanceof GameErrors.GameNotActiveError) {
          logger.warn(
            `Current player retrieval failed for game ${gameId}: Game is not active.`,
          );
        } else if (error instanceof GameErrors.CannotPerformActionError) {
          logger.warn(
            `Current player retrieval failed for game ${gameId}: No players in the game.`,
          );
        } else if (
          error instanceof GameErrors.CouldNotDetermineCurrentPlayerError
        ) {
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
    return CommonUtils.fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
    )
      .chain(GameDomain.validateGameIsActive)
      .chain(GameDomain.validateGameHasPlayers)
      .map(GameDomain.advanceTurn)
      .chain((game) =>
        CommonUtils.saveEntityAndReturnCustomResponse(
          this.gameRepository,
          game,
          GameDomain.buildAdvanceTurnSuccessResponse,
        ),
      )
      .tap((nextPlayerId) =>
        logger.info(
          `Turn advanced for game ${gameId}. Next player: ${nextPlayerId}.`,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(`Advance turn failed: Game ${gameId} not found.`);
        } else if (error instanceof GameErrors.GameNotActiveError) {
          logger.warn(
            `Advance turn failed for game ${gameId}: Game is not active.`,
          );
        } else if (error instanceof GameErrors.CannotPerformActionError) {
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
    return CommonUtils.fetchById(
      this.gameRepository,
      gameId,
      logger,
      'game',
      new GameErrors.GameNotFoundError(),
    )
      .chain(GameDomain.validateUserInGame(userId))
      .chain(GameDomain.validateGameIsActive)
      .chain(async (game) => {
        const { action, winnerId } = GameDomain.abandonGame(game, userId);

        await this.postAbandonmentActionExecutor.execute(action, {
          game,
          gameId,
          winnerId,
        });

        return CommonUtils.Result.success(
          GameDomain.buildAbandonGameSuccessResponse(),
        );
      })
      .tap(() =>
        logger.info(`User ${userId} successfully abandoned game ${gameId}.`),
      )
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(
            `Abandon game failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error instanceof GameErrors.UserNotInGameError) {
          logger.warn(
            `Abandon game failed for user ${userId} in game ${gameId}: User not in this game.`,
          );
        } else if (error instanceof GameErrors.GameNotActiveError) {
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
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(id))
      .tap((trimmedId) =>
        logger.info(`Attempting to retrieve status for game ID: ${trimmedId}`),
      )
      .chain(async (trimmedId) => {
        const game = await this.gameRepository.findGameStatus(trimmedId);
        return game
          ? CommonUtils.Result.success(game)
          : CommonUtils.Result.failure(new GameErrors.GameNotFoundError());
      })
      .tap((game) =>
        logger.info(
          `Successfully retrieved status for game ID ${game._id}: ${game.status}`,
        ),
      )
      .map((game) => game.status)
      .tapError((error) => {
        if (error instanceof GameErrors.InvalidGameIdError) {
          logger.warn(
            `Get game status failed: Invalid game ID provided - "${id}".`,
          );
        } else if (error instanceof GameErrors.GameNotFoundError) {
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
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .tap((trimmedId) =>
        logger.info(
          `Attempting to get top discard card for game ID: ${trimmedId}`,
        ),
      )
      .chain(async (trimmedId) => {
        const game = await this.gameRepository.findDiscardTop(trimmedId);
        return game
          ? CommonUtils.Result.success(game)
          : CommonUtils.Result.failure(new GameErrors.GameNotFoundError());
      })
      .chain(GameDomain.validateGameHasStarted)
      .map(GameDomain.buildGetDiscardTopResponse)
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
        if (error instanceof GameErrors.InvalidGameIdError) {
          logger.warn(
            `Get discard top failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameErrors.GameNotFoundError) {
          const idToLog = gameId ? gameId.trim() : gameId;
          logger.warn(
            `Get discard top failed: Game with ID ${idToLog} not found.`,
          );
        } else if (error instanceof GameErrors.GameHasNotStartedError) {
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
    return new CommonUtils.ResultAsync(
      CommonUtils.Result.fromAsync(async () => {
        logger.info(
          `Attempting to get simple top discard card for game ID: ${gameId}`,
        );

        return await this.getDiscardTop(gameId);
      }),
    )
      .map(GameDomain.buildDiscardTopSimpleResponse)
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
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .tap((trimmedId) =>
        logger.info(`Attempting to get players for game ID: ${trimmedId}`),
      )
      .chain((trimmedId) =>
        CommonUtils.fetchById(
          this.gameRepository,
          trimmedId,
          logger,
          'game',
          new GameErrors.GameNotFoundError(),
        ),
      )
      .chain(async (game) => {
        const playersWithDetails = await this._getPlayersWithDetails(game);

        logger.info(
          `Successfully retrieved ${playersWithDetails.length} players for game ID ${game._id}.`,
        );

        return CommonUtils.Result.success(
          GameDomain.buildGamePlayersResponse(game, playersWithDetails),
        );
      })
      .tapError((error) => {
        if (error instanceof GameErrors.InvalidGameIdError) {
          logger.warn(
            `Get game players failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameErrors.GameNotFoundError) {
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
        return GameDomain.buildPlayerDetails(player, playerDetails);
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
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .chain((trimmedId) =>
        CommonUtils.fetchWithCustomQuery({
          queryFn: () =>
            this.gameRepository.findRecentDiscards(trimmedId, limit),
          logger,
          logMessage: `Attempting to retrieve recent discards for game ID: ${trimmedId} with limit: ${limit}`,
          notFoundError: new GameErrors.GameNotFoundError(),
        }),
      )
      .tap((game) =>
        logger.info(
          `Successfully retrieved recent discards for game ID ${game._id}.`,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameErrors.InvalidGameIdError) {
          logger.warn(
            `Get recent discards failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameErrors.GameNotFoundError) {
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
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .tap((trimmedGameId) =>
        logger.info(
          `Player ${playerId} attempting to play card ${cardId} in game ${trimmedGameId}.`,
        ),
      )
      .chain((trimmedGameId) =>
        CommonUtils.fetchById(
          this.gameRepository,
          trimmedGameId,
          logger,
          'game',
          new GameErrors.GameNotFoundError(),
        ),
      )
      .chain(GameDomain.validateGameIsActive)
      .chain(GameDomain.validateIsCurrentPlayer(playerId))
      .chain(({ game }) =>
        GameDomain.validatePlayerHasCard(playerId, cardId)(game),
      )
      .chain(async ({ game, currentPlayer, cardIndex, cardToPlay }) => {
        return await this.cardPlayCoordinator.execute(
          game,
          gameId,
          playerId,
          currentPlayer,
          cardIndex,
          cardToPlay,
          chosenColor,
        );
      })
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(`Play card failed: Game ${gameId} not found.`);
        } else if (error instanceof GameErrors.InvalidGameIdError) {
          logger.warn(
            `Play card failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameErrors.GameNotActiveError) {
          logger.warn(`Play card failed: Game ${gameId} is not active.`);
        } else if (error instanceof GameErrors.CannotPerformActionError) {
          logger.warn(
            `Play card failed for player ${playerId} in game ${gameId}: ${error.message}`,
          );
        } else {
          logger.error(
            `Failed for player ${playerId} to play card in game ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Retrieves a player's hand of cards
   * @param {string} userId - The ID of the authenticated user
   * @param {string} gameId - The ID of the game
   * @param {string} playerId - The ID of the player whose hand to retrieve
   * @returns {Promise<Object>} Object containing player ID and formatted hand
   * @throws {Error} If game not found or user not authorized
   */
  async getPlayerHand(userId, gameId, playerId) {
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .tap((trimmedGameId) =>
        logger.info(
          `User ${userId} attempting to view hand of player ${playerId} in game ${trimmedGameId}`,
        ),
      )
      .chain((trimmedGameId) =>
        CommonUtils.Result.fromAsync(() =>
          this.gameRepository.findPlayerHand(trimmedGameId, playerId),
        ),
      )
      .chain((gameData) => {
        if (!gameData) {
          return CommonUtils.Result.failure(new GameErrors.GameNotFoundError());
        }
        // Store gameData in the Result for the next chain
        return CommonUtils.Result.success(gameData);
      })
      .chain(
        (gameData) =>
          GameDomain.validateUserMatchesPlayer(userId, playerId).map(
            () => gameData,
          ), // Pass gameData through after validation
      )
      .chain((gameData) => GameDomain.extractPlayerHand(gameData, playerId))
      .map(({ hand }) => GameDomain.buildPlayerHandResponse(playerId, hand))
      .tap((response) =>
        logger.info(
          `Successfully retrieved hand for player ${playerId} in game ${gameId} (${response.hand.length} cards)`,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(`Get player hand failed: Game ${gameId} not found.`);
        } else if (error.message === 'You can only view your own cards') {
          logger.warn(
            `User ${userId} attempted to view cards of player ${playerId} in game ${gameId}`,
          );
        } else {
          logger.error(`Failed to get player hand: ${error.message}`);
        }
      })
      .getOrThrow();
  }

  /**
   * Draws a card from the deck for a player.
   * Validates that the game is active, the user is the current player, and the deck has cards.
   *
   * NEW RULE:
   * If the player has no playable cards, they must draw cards one by one
   * until a playable card is found or the deck becomes empty.
   *
   * @param {string} userId - The ID of the user drawing the card.
   * @param {string} gameId - The ID of the game.
   * @param {string} playerId - The ID of the player drawing the card.
   * @returns {Promise<object>} Result containing the drawn card.
   * @throws {Error} When validation fails or no cards available.
   */
  async drawCard(userId, gameId, playerId) {
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .tap((trimmedGameId) =>
        logger.info(
          `Player ${userId} attempting to draw a card in game ${trimmedGameId}.`,
        ),
      )
      .chain((trimmedGameId) =>
        CommonUtils.fetchById(
          this.gameRepository,
          trimmedGameId,
          logger,
          'game',
          new GameErrors.GameNotFoundError(),
        ),
      )
      .chain(GameDomain.validateGameIsActive)
      .chain((game) =>
        GameDomain.validateUserMatchesPlayer(userId, playerId).map(() => game),
      )
      .chain(GameDomain.validateIsCurrentPlayer(playerId))
      .chain(async (result) => {
        try {
          const game = result.game || result;

          if (!game) {
            logger.error('Game object is null or undefined in drawCard');
            return CommonUtils.Result.failure(
              new GameErrors.GameNotFoundError(),
            );
          }

          const topCard = game.discardPile[game.discardPile.length - 1];
          let currentPlayer = game.players[game.currentPlayerIndex];

          if (!currentPlayer) {
            logger.error(
              `Current player not found at index ${game.currentPlayerIndex} in game ${gameId}`,
            );
            return CommonUtils.Result.failure(
              new GameErrors.CannotPerformActionError(
                'Current player not found',
              ),
            );
          }

          if (!currentPlayer.hand) {
            currentPlayer.hand = [];
          }

          const topColor = topCard.color;
          const topValue = topCard.value;

          const hasPlayableCard = currentPlayer.hand.some((card) => {
            return card.color === topColor || card.value === topValue;
          });

          if (hasPlayableCard) {
            return CommonUtils.Result.failure(
              new GameErrors.CannotPerformActionError(
                'You have playable cards. You cannot draw from the deck.',
              ),
            );
          }

          if (!game.deck || game.deck.length === 0) {
            return CommonUtils.Result.failure(
              new GameErrors.CannotPerformActionError('The deck is empty.'),
            );
          }

          let drawnCard = null;
          let playable = false;

          while (game.deck.length > 0) {
            drawnCard = game.deck.shift();

            currentPlayer.hand.push(drawnCard);

            const cardColor = drawnCard.color;
            const cardValue = drawnCard.value;

            if (cardColor === topColor || cardValue === topValue) {
              playable = true;
              break;
            }
          }

          await game.save();

          return CommonUtils.Result.success({
            message: playable
              ? 'Playable card drawn.'
              : 'No playable card found.',
            cardDrawn: drawnCard,
            playable,
          });
        } catch (err) {
          logger.error(
            `Exception in drawCard for game ${gameId}: ${err?.message || err}`,
          );
          return CommonUtils.Result.failure(
            new GameErrors.CannotPerformActionError(
              `Failed to draw card: ${err?.message || 'Unknown error'}`,
            ),
          );
        }
      })
      .tap((response) =>
        logger.info(
          `Player ${playerId} successfully drew card ${response.cardDrawn} in game ${gameId}.`,
        ),
      )
      .tapError((error) => {
        if (error instanceof GameErrors.GameNotFoundError) {
          logger.warn(`Draw card failed: Game ${gameId} not found.`);
        } else if (error instanceof GameErrors.InvalidGameIdError) {
          logger.warn(
            `Draw card failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error instanceof GameErrors.GameNotActiveError) {
          logger.warn(`Draw card failed: Game ${gameId} is not active.`);
        } else if (error instanceof GameErrors.CannotPerformActionError) {
          logger.warn(
            `Draw card failed for player ${userId} in game ${gameId}: ${error.message}`,
          );
        } else {
          logger.error(
            `Failed for player ${userId} to draw card in game ${gameId}: ${error.message}`,
          );
        }
      })
      .getOrThrow();
  }

  /**
   * Retrieves current real-time scores for all players in a game.
   * @param {string} gameId - The ID of the game.
   * @returns {Promise<Object>} Object containing usernames and their hand scores.
   * @throws {Error} If game not found.
   */
  async getGameScores(gameId) {
    const game = await this.gameRepository.findGameWithPlayerNames(gameId);

    if (!game) {
      throw new GameErrors.GameNotFoundError();
    }

    const scores = GameDomain.calculateAllPlayerScores(game);

    return { scores };
  }

  /**
   * Declares "UNO" for a player in a specific game.
   * Players must declare UNO when they have exactly one card left (or are about to play their second-to-last card).
   *
   * @param {string} gameId - The unique identifier of the game.
   * @param {string} userId - The unique identifier of the player declaring UNO.
   * @returns {Promise<Object>} A Result containing a success message.
   * @throws {Error} If the game is not found, not active, or the player is not allowed to declare UNO.
   */
  async declareUno(gameId, userId) {
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .tap((trimmedId) =>
        logger.info(
          `User ${userId} attempting to declare UNO in game ${trimmedId}`,
        ),
      )
      .chain((trimmedId) =>
        CommonUtils.fetchById(
          this.gameRepository,
          trimmedId,
          logger,
          'game',
          new GameErrors.GameNotFoundError(),
        ),
      )
      .chain(GameDomain.validateGameIsActive)
      .chain(GameDomain.validateUserInGame(userId))
      .chain(async (game) => {
        const player = game.players.find(
          (p) => p._id.toString() === userId.toString(),
        );

        // A player can only declare UNO if they have 1 or 2 cards left.
        if (player.hand.length > 2) {
          return CommonUtils.Result.failure(
            new GameErrors.CannotPerformActionError(
              'You can only declare UNO with 1 or 2 cards remaining.',
            ),
          );
        }

        player.hasDeclaredUno = true;
        await game.save();

        return CommonUtils.Result.success({
          message: 'UNO declared successfully!',
        });
      })
      .tap(() =>
        logger.info(
          `User ${userId} successfully declared UNO in game ${gameId}.`,
        ),
      )
      .tapError((error) =>
        logger.error(
          `Failed to declare UNO for user ${userId}: ${error.message}`,
        ),
      )
      .getOrThrow();
  }

  /**
   * Challenges a player for not saying "UNO" when they have exactly one card left.
   * If the challenge is successful, the target player draws 2 penalty cards.
   *
   * @param {string} gameId - The unique identifier of the game.
   * @param {string} challengerId - The ID of the player initiating the challenge.
   * @param {string} targetPlayerId - The ID of the player being challenged.
   * @returns {Promise<Object>} A Result containing the challenge outcome.
   * @throws {Error} If validation fails or the challenge is invalid.
   */
  async challengeUno(gameId, challengerId, targetPlayerId) {
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .tap((trimmedId) =>
        logger.info(
          `User ${challengerId} challenging ${targetPlayerId} in game ${trimmedId}`,
        ),
      )
      .chain((trimmedId) =>
        CommonUtils.fetchById(
          this.gameRepository,
          trimmedId,
          logger,
          'game',
          new GameErrors.GameNotFoundError(),
        ),
      )
      .chain(GameDomain.validateGameIsActive)
      .chain(GameDomain.validateUserInGame(challengerId))
      .chain(async (game) => {
        const targetPlayer = game.players.find(
          (p) => p._id.toString() === targetPlayerId.toString(),
        );
        if (!targetPlayer) {
          return CommonUtils.Result.failure(
            new GameErrors.CannotPerformActionError(
              'Target player not found in game.',
            ),
          );
        }

        // Challenge condition: Target has exactly 1 card and forgot to declare UNO
        if (
          targetPlayer.hand.length === 1 &&
          targetPlayer.hasDeclaredUno === false
        ) {
          const penaltyCards = [];
          for (let i = 0; i < 2; i++) {
            if (game.deck.length > 0) penaltyCards.push(game.deck.shift());
          }

          if (!targetPlayer.hand) targetPlayer.hand = [];
          targetPlayer.hand.push(...penaltyCards);

          await game.save();

          return CommonUtils.Result.success({
            message: 'Challenge successful! Target player drew penalty cards.',
            penaltyApplied: true,
            cardsDrawn: penaltyCards.length,
          });
        }

        return CommonUtils.Result.failure(
          new GameErrors.CannotPerformActionError(
            'Invalid challenge. Player is safe or has more than 1 card.',
          ),
        );
      })
      .tapError((error) =>
        logger.error(`Challenge failed in game ${gameId}: ${error.message}`),
      )
      .getOrThrow();
  }

  /**
   * Retrieves a secure and complete snapshot of the current game state.
   * Masks opponents' hands to prevent cheating while providing necessary UI information.
   *
   * @param {string} gameId - The unique identifier of the game.
   * @param {string} userId - The ID of the user requesting the game state.
   * @returns {Promise<Object>} A Result containing the game state snapshot.
   * @throws {Error} If the game is not found or the user is not in the game.
   */
  async getFullGameState(gameId, userId) {
    return new CommonUtils.ResultAsync(GameDomain.validateGameId(gameId))
      .chain((trimmedId) =>
        CommonUtils.fetchById(
          this.gameRepository,
          trimmedId,
          logger,
          'game',
          new GameErrors.GameNotFoundError(),
        ),
      )
      .chain(GameDomain.validateUserInGame(userId))
      .chain(async (game) => {
        const topCard =
          game.discardPile.length > 0
            ? game.discardPile[game.discardPile.length - 1]
            : null;

        const playersSnapshot = game.players.map((p) => ({
          id: p._id,
          position: p.position,
          handSize: p.hand ? p.hand.length : 0,
          hasDeclaredUno: p.hasDeclaredUno,
          isCurrentTurn: game.currentPlayerIndex === p.position,
          isMe: p._id.toString() === userId.toString(),
        }));

        return CommonUtils.Result.success({
          gameId: game._id,
          status: game.status,
          turnDirection:
            game.turnDirection === 1 ? 'Clockwise' : 'Counter-clockwise',
          currentColor: game.currentColor,
          topCard: topCard,
          players: playersSnapshot,
        });
      })
      .tapError((error) =>
        logger.error(
          `Failed to get full game state for ${gameId}: ${error.message}`,
        ),
      )
      .getOrThrow();
  }
}

export default GameService;
