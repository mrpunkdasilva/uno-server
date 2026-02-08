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
   * Retrieves all games from the database
   * @returns {Promise<Array>} Array of all game objects
   * @throws {Error} When database operation fails
   */
  async getAllGames() {
    logger.info('Attempting to retrieve all games.');
    try {
      const games = await this.gameRepository.findAll();
      logger.info(`Successfully retrieved ${games.length} games.`);
      return games.map((game) => gameResponseDtoSchema.parse(game));
    } catch (error) {
      logger.error(`Failed to retrieve all games: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves a game by its ID
   * @param {string} id - The ID of the game to retrieve
   * @returns {Promise<Object>} The game object if found
   * @throws {Error} When game is not found
   */
  async getGameById(id) {
    logger.info(`Attempting to retrieve game by ID: ${id}`);
    try {
      const game = await this.gameRepository.findById(id);
      if (!game) {
        logger.warn(`Game with ID ${id} not found.`);
        throw new Error('Game not found');
      }
      logger.info(`Game with ID ${id} retrieved successfully.`);
      return gameResponseDtoSchema.parse(game);
    } catch (error) {
      logger.error(`Failed to retrieve game by ID ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a new game with the provided game data
   * @param {Object} gameData - The data for creating a new game
   * @param {string} userId - The ID of the user creating the game
   * @returns {Promise<Object>} The created game object formatted as response DTO
   * @throws {Error} When game creation fails or validation errors occur
   */
  /**
   * Creates a new game with the provided game data, validating it against createGameDtoSchema.
   * @param {Object} gameData - The data for creating a new game, validated by createGameDtoSchema.
   * @param {string} userId - The ID of the user creating the game.
   * @returns {Promise<Object>} The created game object formatted as response DTO.
   * @throws {Error} When game creation fails or validation errors occur (e.g., ZodError).
   */
  async createGame(gameData, userId) {
    logger.info(`Attempting to create a new game by user ID: ${userId}`);
    try {
      const { name, rules, maxPlayers } = createGameDtoSchema.parse(gameData);

      const data = {
        title: name,
        rules: rules,
        maxPlayers: maxPlayers,
        creatorId: userId,
        players: [{ _id: userId, ready: true, position: 1 }],
      };

      const game = await this.gameRepository.createGame(data);
      logger.info(`Game ${game._id} created successfully by user ${userId}.`);

      return gameResponseDtoSchema.parse({
        id: game._id.toString(),
        title: game.title,
        rules: game.rules,
        status: game.status,
        maxPlayers: game.maxPlayers,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      });
    } catch (error) {
      logger.error(`Failed to create game by user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates an existing game with new data
   * @param {string} id - The ID of the game to update
   * @param {Object} updateData - The data to update the game with
   * @returns {Promise<Object>} The updated game object formatted as response DTO
   * @throws {Error} When game is not found or validation fails
   */
  async updateGame(id, updateData) {
    logger.info(`Attempting to update game with ID: ${id}`);
    try {
      const validatedData = updateGameDtoSchema.parse(updateData);

      const updatedGame = await this.gameRepository.update(id, validatedData);

      if (!updatedGame) {
        logger.warn(`Game with ID ${id} not found for update.`);
        throw new Error('Game not found');
      }

      logger.info(`Game with ID ${id} updated successfully.`);
      return gameResponseDtoSchema.parse({
        id: updatedGame._id.toString(),
        title: updatedGame.title,
        status: updatedGame.status,
        maxPlayers: updatedGame.maxPlayers,
        createdAt: updatedGame.createdAt,
        updatedAt: updatedGame.updatedAt,
      });
    } catch (error) {
      logger.error(`Failed to update game with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a game by its ID
   * @param {string} id - The ID of the game to delete
   * @returns {Promise<Object>} The deleted game object
   * @throws {Error} When game is not found
   */
  async deleteGame(id) {
    logger.info(`Attempting to delete game with ID: ${id}`);
    try {
      const game = await this.gameRepository.findById(id);
      if (!game) {
        logger.warn(`Game with ID ${id} not found for deletion.`);
        throw new Error('Game not found');
      }
      await this.gameRepository.delete(id);
      logger.info(`Game with ID ${id} deleted successfully.`);
      return game;
    } catch (error) {
      logger.error(`Failed to delete game with ID ${id}: ${error.message}`);
      throw error;
    }
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
    logger.info(`User ${userId} attempting to join game ${gameId}.`);
    try {
      const game = await this.gameRepository.findById(gameId);

      if (!game) {
        logger.warn(
          `Join game failed for user ${userId}: Game ${gameId} not found.`,
        );
        throw new Error('Game not found');
      }

      if (game.status !== 'Waiting') {
        logger.warn(
          `Join game failed for user ${userId} in game ${gameId}: Game not in 'Waiting' status.`,
        );
        throw new Error(
          'Game is not accepting new players (Already Active or Ended)',
        );
      }

      if (game.players.length >= game.maxPlayers) {
        logger.warn(
          `Join game failed for user ${userId} in game ${gameId}: Game is full.`,
        );
        throw new Error('Game is full');
      }

      const isAlreadyInGame = game.players.some(
        (p) => p._id.toString() === userId,
      );

      if (isAlreadyInGame) {
        logger.warn(
          `Join game failed for user ${userId} in game ${gameId}: User already in this game.`,
        );
        throw new Error('User is already in this game');
      }

      game.players.push({ _id: userId, ready: false, position: 0 });
      await this.gameRepository.save(game);
      logger.info(`User ${userId} successfully joined game ${gameId}.`);

      return {
        message: 'User joined the game successfully',
        gameId: game._id,
        currentPlayerCount: game.players.length,
      };
    } catch (error) {
      logger.error(
        `Failed for user ${userId} to join game ${gameId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Set the given player as ready for the game.
   *
   * @param {string} userId - The ID of the user setting ready.
   * @param {string} gameId - The ID of the game.
   * @returns {Promise<Object>} Object with success message and counts.
   */
  async setPlayerReady(userId, gameId) {
    logger.info(`User ${userId} attempting to set ready in game ${gameId}.`);
    try {
      const game = await this.gameRepository.findById(gameId);

      if (!game) {
        logger.warn(
          `Set player ready failed for user ${userId}: Game ${gameId} not found.`,
        );
        throw new Error('Game not found');
      }

      if (game.status !== 'Waiting') {
        logger.warn(
          `Set player ready failed for user ${userId} in game ${gameId}: Game not in 'Waiting' status.`,
        );
        throw new Error('Cannot ready now');
      }

      const playerEntry = game.players.find((p) => p._id.toString() === userId);
      if (!playerEntry) {
        logger.warn(
          `Set player ready failed for user ${userId} in game ${gameId}: User not in this game.`,
        );
        throw new Error('You are not in this game');
      }

      if (playerEntry.ready) {
        logger.info(`User ${userId} in game ${gameId} is already ready.`);
        return {
          success: true,
          message: 'Already ready',
          playersReadyCount: game.players.filter((p) => p.ready).length,
          totalPlayers: game.players.length,
        };
      }

      playerEntry.ready = true;
      await this.gameRepository.save(game);
      logger.info(`User ${userId} successfully set ready in game ${gameId}.`);

      return {
        success: true,
        message: 'Player set to ready',
        playersReadyCount: game.players.filter((p) => p.ready).length,
        totalPlayers: game.players.length,
      };
    } catch (error) {
      logger.error(
        `Failed for user ${userId} to set ready in game ${gameId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Starts a game.
   * @param {string} userId - The ID of the user starting the game.
   * @param {string} gameId - The ID of the game to start.
   * @returns {Promise<Object>} The started game object.
   */
  async startGame(userId, gameId) {
    logger.info(`User ${userId} attempting to start game ${gameId}.`);
    try {
      const game = await this.gameRepository.findById(gameId);

      if (!game) {
        logger.warn(
          `Game start failed for user ${userId}: Game ${gameId} not found.`,
        );
        throw new Error('Game not found');
      }

      if (game.creatorId.toString() !== userId) {
        logger.warn(
          `Game start failed for user ${userId} in game ${gameId}: Not the game creator.`,
        );
        throw new Error('Only the game creator can start the game');
      }

      if (game.status === 'Active') {
        logger.warn(
          `Game start failed for user ${userId} in game ${gameId}: Game already started.`,
        );
        throw new Error('Game has already started');
      }

      if (game.players.length < game.minPlayers) {
        logger.warn(
          `Game start failed for user ${userId} in game ${gameId}: Not enough players (${game.players.length}/${game.minPlayers}).`,
        );
        throw new Error(`Minimum ${game.minPlayers} players required to start`);
      }

      const notReadyPlayers = game.players.filter((player) => !player.ready);
      if (notReadyPlayers.length > 0) {
        logger.warn(
          `Game start failed for user ${userId} in game ${gameId}: Not all players are ready.`,
        );
        throw new Error('Not all players are ready');
      }

      game.status = 'Active';
      game.players.forEach((player, index) => {
        player.position = index + 1;
      });

      await this.gameRepository.save(game);
      logger.info(`Game ${gameId} successfully started by user ${userId}.`);

      return gameResponseDtoSchema.parse({
        id: game._id.toString(),
        title: game.title,
        status: game.status,
        maxPlayers: game.maxPlayers,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
      });
    } catch (error) {
      logger.error(
        `Failed for user ${userId} to start game ${gameId}: ${error.message}`,
      );
      throw error;
    }
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
    logger.info(`User ${userId} attempting to abandon game ${gameId}.`);
    try {
      const game = await this.gameRepository.findById(gameId);

      if (!game) {
        logger.warn(
          `Abandon game failed for user ${userId}: Game ${gameId} not found.`,
        );
        throw new Error('Game not found');
      }

      const player = game.players.find((p) => p._id.toString() === userId);
      if (!player) {
        logger.warn(
          `Abandon game failed for user ${userId} in game ${gameId}: User not in this game.`,
        );
        throw new Error('You are not in this game');
      }

      if (game.status !== 'Active') {
        logger.warn(
          `Abandon game failed for user ${userId} in game ${gameId}: Game not in 'Active' status.`,
        );
        throw new Error('Cannot abandon now');
      }

      game.players = game.players.filter((p) => p._id.toString() !== userId);

      game.players.forEach((p, index) => {
        p.position = index + 1;
      });

      if (game.players.length === 1) {
        game.status = 'Ended';
        game.winnerId = game.players[0]._id;
        logger.info(
          `Game ${gameId} ended due to last player (${game.players[0]._id}) remaining after abandonment.`,
        );
      } else if (game.players.length === 0) {
        game.status = 'Ended';
        logger.info(`Game ${gameId} ended as all players abandoned.`);
      }

      await this.gameRepository.save(game);
      logger.info(`User ${userId} successfully abandoned game ${gameId}.`);

      return {
        success: true,
        message: 'You left the game',
      };
    } catch (error) {
      logger.error(
        `Failed for user ${userId} to abandon game ${gameId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves the current status of a game.
   *
   * @param {string} id - The ID of the game to retrieve the status for.
   * @returns {Promise<string>} The status of the game ("Waiting", "Active", "Pause", "Ended").
   * @throws {Error} If the game ID is invalid or the game is not found.
   */
  async getGameStatus(id) {
    logger.info(`Attempting to retrieve status for game ID: ${id}`);
    try {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        logger.warn(
          `Get game status failed: Invalid game ID provided - "${id}".`,
        );
        throw new Error('Invalid game ID');
      }

      const trimmedId = id.trim();
      const game = await this.gameRepository.findGameStatus(trimmedId);
      if (!game) {
        logger.warn(
          `Get game status failed: Game with ID ${trimmedId} not found.`,
        );
        throw new Error('Game not found');
      }

      logger.info(
        `Successfully retrieved status for game ID ${trimmedId}: ${game.status}`,
      );
      return game.status;
    } catch (error) {
      logger.error(
        `Failed to retrieve game status for ID ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get the top card from the discard pile
   * @param {string} gameId - The game ID
   * @returns {Promise<Object>} Top card information
   * @throws {Error} When game is not found or ID is invalid
   */
  async getDiscardTop(gameId) {
    logger.info(`Attempting to get top discard card for game ID: ${gameId}`);
    try {
      if (!gameId || typeof gameId !== 'string' || gameId.trim() === '') {
        logger.warn(
          `Get discard top failed: Invalid game ID provided - "${gameId}".`,
        );
        throw new Error('Invalid game ID');
      }

      const trimmedId = gameId.trim();

      const game = await this.gameRepository.findDiscardTop(trimmedId);

      if (!game) {
        logger.warn(
          `Get discard top failed: Game with ID ${trimmedId} not found.`,
        );
        throw new Error('Game not found');
      }

      if (game.status === 'Waiting') {
        logger.warn(
          `Get discard top for game ${trimmedId}: Game has not started yet.`,
        );
        return {
          game_id: trimmedId,
          error: 'Game has not started yet',
          game_state: 'waiting',
          initial_card: game.initialCard || {
            color: 'blue',
            value: '0',
            type: 'number',
          },
        };
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
    } catch (error) {
      logger.error(
        `Failed to get discard top for game ID ${gameId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get discard top with simple response (legacy support)
   * @param {string} gameId - The game ID
   * @returns {Promise<Object>} Simple top card response
   */
  async getDiscardTopSimple(gameId) {
    logger.info(
      `Attempting to get simple top discard card for game ID: ${gameId}`,
    );
    try {
      const result = await this.getDiscardTop(gameId);

      if (result.error) {
        logger.warn(
          `Simple discard top retrieval failed for game ${gameId}: ${result.error}`,
        );
        return result;
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
    } catch (error) {
      logger.error(
        `Failed to get simple discard top for game ID ${gameId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves the list of players in a specific game
   * @param {string} gameId - The ID of the game
   * @returns {Promise<Object>} Object containing game info and player list
   * @throws {Error} When game is not found or ID is invalid
   */
  async getGamePlayers(gameId) {
    logger.info(`Attempting to get players for game ID: ${gameId}`);
    try {
      if (!gameId || typeof gameId !== 'string' || gameId.trim() === '') {
        logger.warn(
          `Get game players failed: Invalid game ID provided - "${gameId}".`,
        );
        throw new Error('Invalid game ID');
      }

      const trimmedId = gameId.trim();
      const game = await this.gameRepository.findById(trimmedId);

      if (!game) {
        logger.warn(
          `Get game players failed: Game with ID ${trimmedId} not found.`,
        );
        throw new Error('Game not found');
      }

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

      return {
        gameId: trimmedId,
        gameTitle: game.title,
        gameStatus: game.status,
        totalPlayers: playersWithDetails.length,
        maxPlayers: game.maxPlayers,
        players: playersWithDetails,
      };
    } catch (error) {
      logger.error(
        `Failed to get players for game ID ${gameId}: ${error.message}`,
      );
      throw error;
    }
  }
}

export default GameService;
