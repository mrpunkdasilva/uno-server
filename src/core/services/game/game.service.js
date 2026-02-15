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
      .map((game) => GameDomain.startGameLogic(game))
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
      .chain((game) => GameDomain.getCurrentPlayerFromGame(game))
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
      .map(GameDomain.advanceTurnLogic)
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
        const { action, winnerId } = GameDomain.abandonGameLogic(game, userId);

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
      .chain(GameDomain.validatePlayerHasCard(playerId, cardId))
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
}

export default GameService;
