import { Result, ResultAsync } from '../../core/utils/Result.js';
import gameResponseDtoSchema from '../../presentation/dtos/game/game-response.dto.js';
import updateGameDtoSchema from '../../presentation/dtos/game/update-game.dto.js';
import createGameDtoSchema from '../../presentation/dtos/game/create-game.dto.js';
import GameRepository from '../../infra/repositories/game.repository.js';
import logger from '../../config/logger.js';
import { colorMap, valueMap } from '../enums/card.enum.js';
import PlayerRepository from '../../infra/repositories/player.repository.js';

/**
 * Service class for handling game-related business logic.
 */
class GameService {
  /**
   * Initializes the GameService with a GameRepository instance.
   */
  constructor() {
    this.gameRepository = new GameRepository();
    this.playerRepository = new PlayerRepository();
  }

  /**
   * Retrieves all games from the database.
   * @returns {Promise<Array>} Array of all game objects.
   * @throws {Error} When database operation fails.
   */
  async getAllGames() {
    const gameResult = new ResultAsync(
      Result.fromAsync(async () => {
        logger.info('Attempting to retrieve all games.');
        return await this.gameRepository.findAll();
      }),
    );

    return gameResult
      .tap((games) =>
        logger.info(`Successfully retrieved ${games.length} games.`),
      )
      .map((games) => games.map((game) => gameResponseDtoSchema.parse(game)))
      .tapError((error) =>
        logger.error(`Failed to retrieve all games: ${error.message}`),
      )
      .getOrThrow();
  }

  /**
   * Retrieves a game by its ID
   * @param {string} id - The ID of the game to retrieve
   * @returns {Promise<Object>} The game object if found
   * @throws {Error} When game is not found
   */
  async getGameById(id) {
    const gameResult = new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`Attempting to retrieve game by ID: ${id}`);
        const game = await this.gameRepository.findById(id);
        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    );

    return gameResult
      .tap((game) =>
        logger.info(`Game with ID ${game._id} retrieved successfully.`),
      )
      .map((game) => gameResponseDtoSchema.parse(game))
      .tapError((error) => {
        if (error.message === 'Game not found') {
          logger.warn(`Game with ID ${id} not found.`);
        } else {
          logger.error(`Failed to retrieve game by ID ${id}: ${error.message}`);
        }
      })
      .getOrThrow();
  }

  /**

     * Creates a new game with the provided game data.

     * @param {Object} gameData - The data for creating a new game.

     * @param {string} userId - The ID of the user creating the game.

     * @returns {Promise<Object>} The created game object formatted as response DTO.

     */

  /**
   * Creates a new game with the provided game data.
   * @param {Object} gameData - The data for creating a new game.
   * @param {string} userId - The ID of the user creating the game.
   * @returns {Promise<Object>} The created game object formatted as response DTO.
   */
  /**
   * Creates a new game with the provided game data.
   * @param {Object} gameData - The data for creating a new game.
   * @param {string} userId - The ID of the user creating the game.
   * @returns {Promise<Object>} The created game object formatted as response DTO.
   */
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
        const { name, rules, maxPlayers, minPlayers } =
          createGameDtoSchema.parse(gameData);

        const data = {
          title: name,
          rules: rules,
          maxPlayers: maxPlayers,
          minPlayers: minPlayers,
          creatorId: userId,
          players: [{ _id: userId, ready: true, position: 1 }],
        };

        return await this.gameRepository.createGame(data);
      }),
    )
      .tap((game) =>
        logger.info(`Game ${game._id} created successfully by user ${userId}.`),
      )
      .map((game) =>
        gameResponseDtoSchema.parse({
          id: game._id.toString(),
          title: game.title,
          rules: game.rules,
          status: game.status,
          maxPlayers: game.maxPlayers,
          minPlayers: game.minPlayers,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        }),
      )
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
    const gameResult = new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`Attempting to update game with ID: ${id}`);
        const validatedData = updateGameDtoSchema.parse(updateData);

        const updatedGame = await this.gameRepository.update(id, validatedData);

        if (!updatedGame) {
          throw new Error('Game not found');
        }
        return updatedGame;
      }),
    );

    return gameResult
      .tap((game) =>
        logger.info(`Game with ID ${game._id} updated successfully.`),
      )
      .map((updatedGame) =>
        gameResponseDtoSchema.parse({
          id: updatedGame._id.toString(),
          title: updatedGame.title,
          status: updatedGame.status,
          maxPlayers: updatedGame.maxPlayers,
          minPlayers: updatedGame.minPlayers,
          createdAt: updatedGame.createdAt,
          updatedAt: updatedGame.updatedAt,
        }),
      )
      .tapError((error) => {
        if (error.message === 'Game not found') {
          logger.warn(`Game with ID ${id} not found for update.`);
        } else {
          logger.error(`Failed to update game with ID ${id}: ${error.message}`);
        }
      })
      .getOrThrow();
  }

  /**
   * Deletes a game by its ID
   * @param {string} id - The ID of the game to delete
   * @returns {Promise<Object>} The deleted game object
   * @throws {Error} When game is not found
   */
  async deleteGame(id) {
    const gameResult = new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`Attempting to delete game with ID: ${id}`);
        const game = await this.gameRepository.findById(id);
        if (!game) {
          throw new Error('Game not found');
        }
        await this.gameRepository.delete(id);
        return game;
      }),
    );

    return gameResult
      .tap((game) =>
        logger.info(`Game with ID ${game._id} deleted successfully.`),
      )
      .tapError((error) => {
        if (error.message === 'Game not found') {
          logger.warn(`Game with ID ${id} not found for deletion.`);
        } else {
          logger.error(`Failed to delete game with ID ${id}: ${error.message}`);
        }
      })
      .getOrThrow();
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
        const updatePayload = {
          status: 'Ended',
          endedAt: new Date(),
          winnerId: winnerId,
        };
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
    const checkResult = new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `Checking if player ${playerId} has won game ${gameId} by emptying hand.`,
        );
        const handSize = await this.gameRepository.getPlayerHandSize(
          gameId,
          playerId,
        );
        if (handSize === 0) {
          logger.info(
            `Player ${playerId} has won game ${gameId}. Ending game.`,
          );
          await this._endGame(gameId, playerId);
          return true;
        }
        return false;
      }),
    );

    return checkResult
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
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`User ${userId} attempting to join game ${gameId}.`);
        const game = await this.gameRepository.findById(gameId);

        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    )
      .chain((game) => {
        if (game.status !== 'Waiting') {
          return Result.failure(
            new Error(
              'Game is not accepting new players (Already Active or Ended)',
            ),
          );
        }
        return Result.success(game);
      })
      .chain((game) => {
        if (game.players.length >= game.maxPlayers) {
          return Result.failure(new Error('Game is full'));
        }
        return Result.success(game);
      })
      .chain((game) => {
        const isAlreadyInGame = game.players.some(
          (p) => p._id.toString() === userId,
        );
        if (isAlreadyInGame) {
          return Result.failure(new Error('User is already in this game'));
        }
        return Result.success(game);
      })
      .chain(async (game) => {
        game.players.push({ _id: userId, ready: false, position: 0 });
        await this.gameRepository.save(game);
        return Result.success({
          message: 'User joined the game successfully',
          gameId: game._id,
          currentPlayerCount: game.players.length,
        });
      })
      .tap(() =>
        logger.info(`User ${userId} successfully joined game ${gameId}.`),
      )
      .tapError((error) => {
        if (error.message === 'Game not found') {
          logger.warn(
            `Join game failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (
          error.message ===
          'Game is not accepting new players (Already Active or Ended)'
        ) {
          logger.warn(
            `Join game failed for user ${userId} in game ${gameId}: Game not in 'Waiting' status.`,
          );
        } else if (error.message === 'Game is full') {
          logger.warn(
            `Join game failed for user ${userId} in game ${gameId}: Game is full.`,
          );
        } else if (error.message === 'User is already in this game') {
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
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `User ${userId} attempting to set ready in game ${gameId}.`,
        );
        const game = await this.gameRepository.findById(gameId);

        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    )
      .chain((game) => {
        if (game.status !== 'Waiting') {
          return Result.failure(new Error('Cannot ready now'));
        }
        return Result.success(game);
      })
      .chain((game) => {
        const playerEntry = game.players.find(
          (p) => p._id.toString() === userId,
        );
        if (!playerEntry) {
          return Result.failure(new Error('You are not in this game'));
        }
        return Result.success({ game, playerEntry });
      })
      .chain(async ({ game, playerEntry }) => {
        if (playerEntry.ready) {
          logger.info(`User ${userId} in game ${gameId} is already ready.`);
          return Result.success({
            success: true,
            message: 'Already ready',
            playersReadyCount: game.players.filter((p) => p.ready).length,
            totalPlayers: game.players.length,
          });
        }

        playerEntry.ready = true;
        await this.gameRepository.save(game);
        logger.info(`User ${userId} successfully set ready in game ${gameId}.`);

        return Result.success({
          success: true,
          message: 'Player set to ready',
          playersReadyCount: game.players.filter((p) => p.ready).length,
          totalPlayers: game.players.length,
        });
      })
      .tapError((error) => {
        if (error.message === 'Game not found') {
          logger.warn(
            `Set player ready failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error.message === 'Cannot ready now') {
          logger.warn(
            `Set player ready failed for user ${userId} in game ${gameId}: Game not in 'Waiting' status.`,
          );
        } else if (error.message === 'You are not in this game') {
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
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`User ${userId} attempting to start game ${gameId}.`);
        const game = await this.gameRepository.findById(gameId);

        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    )
      .chain((game) => {
        if (game.creatorId.toString() !== userId) {
          return Result.failure(
            new Error('Only the game creator can start the game'),
          );
        }
        return Result.success(game);
      })
      .chain((game) => {
        if (game.status === 'Active') {
          return Result.failure(new Error('Game has already started'));
        }
        return Result.success(game);
      })
      .chain((game) => {
        if (game.players.length < game.minPlayers) {
          return Result.failure(
            new Error(`Minimum ${game.minPlayers} players required to start`),
          );
        }
        return Result.success(game);
      })
      .chain((game) => {
        const notReadyPlayers = game.players.filter((player) => !player.ready);
        if (notReadyPlayers.length > 0) {
          return Result.failure(new Error('Not all players are ready'));
        }
        return Result.success(game);
      })
      .chain(async (game) => {
        game.status = 'Active';
        game.currentPlayerIndex = 0; // First player starts
        game.turnDirection = 1; // Clockwise
        game.players.forEach((player, index) => {
          player.position = index + 1;
        });

        await this.gameRepository.save(game);
        logger.info(`Game ${gameId} successfully started by user ${userId}.`);

        return Result.success(
          gameResponseDtoSchema.parse({
            id: game._id.toString(),
            title: game.title,
            status: game.status,
            maxPlayers: game.maxPlayers,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          }),
        );
      })
      .tapError((error) => {
        if (error.message === 'Game not found') {
          logger.warn(
            `Game start failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (
          error.message === 'Only the game creator can start the game'
        ) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: Not the game creator.`,
          );
        } else if (error.message === 'Game has already started') {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: Game already started.`,
          );
        } else if (error.message.startsWith('Minimum')) {
          logger.warn(
            `Game start failed for user ${userId} in game ${gameId}: ${error.message}`,
          );
        } else if (error.message === 'Not all players are ready') {
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
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `Attempting to retrieve current player for game ID: ${gameId}`,
        );
        const game = await this.gameRepository.findById(gameId);

        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    )
      .chain((game) => {
        if (game.status !== 'Active') {
          return Result.failure(new Error('Game is not active'));
        }
        return Result.success(game);
      })
      .chain((game) => {
        if (!game.players || game.players.length === 0) {
          return Result.failure(new Error('No players in game'));
        }
        return Result.success(game);
      })
      .chain((game) => {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (!currentPlayer) {
          return Result.failure(
            new Error('Could not determine current player'),
          );
        }
        return Result.success(currentPlayer);
      })
      .tap((currentPlayer) =>
        logger.info(
          `Successfully retrieved current player ${currentPlayer._id} for game ${gameId}.`,
        ),
      )
      .map((currentPlayer) => currentPlayer._id.toString())
      .tapError((error) => {
        if (error.message === 'Game not found') {
          logger.warn(
            `Current player retrieval failed: Game ${gameId} not found.`,
          );
        } else if (error.message === 'Game is not active') {
          logger.warn(
            `Current player retrieval failed for game ${gameId}: Game is not active.`,
          );
        } else if (error.message === 'No players in game') {
          logger.warn(
            `Current player retrieval failed for game ${gameId}: No players in the game.`,
          );
        } else if (error.message === 'Could not determine current player') {
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
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`Advancing turn for game ID: ${gameId}`);
        const game = await this.gameRepository.findById(gameId);

        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    )
      .chain((game) => {
        if (game.status !== 'Active') {
          return Result.failure(new Error('Game is not active'));
        }
        return Result.success(game);
      })
      .chain((game) => {
        if (!game.players || game.players.length === 0) {
          return Result.failure(new Error('No players in game'));
        }
        return Result.success(game);
      })
      .chain(async (game) => {
        const numPlayers = game.players.length;
        let nextPlayerIndex =
          (game.currentPlayerIndex + game.turnDirection + numPlayers) %
          numPlayers;

        game.currentPlayerIndex = nextPlayerIndex;
        await this.gameRepository.save(game);

        return Result.success(game.players[nextPlayerIndex]._id.toString());
      })
      .tap((nextPlayerId) =>
        logger.info(
          `Turn advanced for game ${gameId}. Next player: ${nextPlayerId}.`,
        ),
      )
      .tapError((error) => {
        if (error.message === 'Game not found') {
          logger.warn(`Advance turn failed: Game ${gameId} not found.`);
        } else if (error.message === 'Game is not active') {
          logger.warn(
            `Advance turn failed for game ${gameId}: Game is not active.`,
          );
        } else if (error.message === 'No players in game') {
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
    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`User ${userId} attempting to abandon game ${gameId}.`);
        const game = await this.gameRepository.findById(gameId);

        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    )
      .chain((game) => {
        const player = game.players.find((p) => p._id.toString() === userId);
        if (!player) {
          return Result.failure(new Error('You are not in this game'));
        }
        return Result.success(game);
      })
      .chain((game) => {
        if (game.status !== 'Active') {
          return Result.failure(new Error('Cannot abandon now'));
        }
        return Result.success(game);
      })
      .chain(async (game) => {
        game.players = game.players.filter((p) => p._id.toString() !== userId);
        game.players.forEach((p, index) => {
          p.position = index + 1;
        });

        if (game.players.length === 1) {
          await this._endGame(gameId, game.players[0]._id);
          logger.info(
            `Game ${gameId} ended due to last player (${game.players[0]._id}) remaining after abandonment.`,
          );
        } else if (game.players.length === 0) {
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
        if (error.message === 'Game not found') {
          logger.warn(
            `Abandon game failed for user ${userId}: Game ${gameId} not found.`,
          );
        } else if (error.message === 'You are not in this game') {
          logger.warn(
            `Abandon game failed for user ${userId} in game ${gameId}: User not in this game.`,
          );
        } else if (error.message === 'Cannot abandon now') {
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
          throw new Error('Invalid game ID');
        }

        const trimmedId = id.trim();
        const game = await this.gameRepository.findGameStatus(trimmedId);
        if (!game) {
          throw new Error('Game not found');
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
    const trimmedId = gameId.trim(); // Declare trimmedId once

    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(
          `Attempting to get top discard card for game ID: ${gameId}`,
        );
        if (!gameId || typeof gameId !== 'string' || trimmedId === '') {
          throw new Error('Invalid game ID');
        }

        const game = await this.gameRepository.findDiscardTop(trimmedId);

        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    )
      .chain((game) => {
        if (game.status === 'Waiting') {
          logger.warn(
            `Get discard top for game ${trimmedId}: Game has not started yet.`,
          );
          return Result.success({
            game_id: trimmedId,
            error: 'Game has not started yet',
            game_state: 'waiting',
            initial_card: game.initialCard || {
              color: 'blue',
              value: '0',
              type: 'number',
            },
          });
        }
        return Result.success(game);
      })
      .chain((game) => {
        if (game.error) {
          // If it's a special status object from previous chain
          return Result.success(game);
        }
        if (!game.discardPile || game.discardPile.length === 0) {
          logger.info(
            `Get discard top for game ${trimmedId}: Discard pile is empty.`,
          );
          return Result.success({
            game_id: trimmedId,
            top_card: null,
            message: 'Discard pile is empty - no cards have been played yet',
            discard_pile_size: 0,
            initial_card: game.initialCard || {
              color: 'blue',
              value: '0',
              type: 'number',
            },
          });
        }
        return Result.success(game);
      })
      .map((gameOrSpecialResult) => {
        if (
          gameOrSpecialResult.error ||
          gameOrSpecialResult.top_card === null
        ) {
          return gameOrSpecialResult; // Pass through special results
        }

        const game = gameOrSpecialResult; // It's a game object
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
        if (error.message === 'Invalid game ID') {
          logger.warn(
            `Get discard top failed: Invalid game ID provided - "${gameId}".`,
          );
        } else if (error.message === 'Game not found') {
          logger.warn(
            `Get discard top failed: Game with ID ${trimmedId} not found.`,
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
        // getDiscardTop já retorna ou lança um erro, então precisamos encapsulá-lo
        // para que seja tratado como um Result.
        const result = await this.getDiscardTop(gameId);
        return result;
      }),
    )
      .map((result) => {
        if (result.error) {
          logger.warn(
            `Simple discard top retrieval failed for game ${gameId}: ${result.error}`,
          );
          return result; // Propagate special error result
        }

        if (result.top_card === null) {
          logger.info(
            `Simple discard top for game ${gameId}: Discard pile is empty.`,
          );
          return {
            game_ids: [result.game_id],
            top_cards: [],
          };
        }

        const card = result.current_top_card;
        const color = colorMap[card.color] || card.color;
        const value = valueMap[card.value] || card.value;
        const cardName = `${color} ${value}`;

        logger.info(
          `Successfully retrieved simple top discard card for game ID ${gameId}.`,
        );
        return {
          game_ids: [result.game_id],
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
    const trimmedId = gameId.trim(); // Declare trimmedId once

    return new ResultAsync(
      Result.fromAsync(async () => {
        logger.info(`Attempting to get players for game ID: ${gameId}`);
        if (!gameId || typeof gameId !== 'string' || trimmedId === '') {
          throw new Error('Invalid game ID');
        }

        const game = await this.gameRepository.findById(trimmedId);

        if (!game) {
          throw new Error('Game not found');
        }
        return game;
      }),
    )
      .chain(async (game) => {
        // Get detailed player information
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
}

export default GameService;
