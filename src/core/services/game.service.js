import gameResponseDtoSchema from '../../presentation/dtos/game/game-response.dto.js';
import updateGameDtoSchema from '../../presentation/dtos/game/update-game.dto.js';
import createGameDtoSchema from '../../presentation/dtos/game/create-game.dto.js';
import GameRepository from '../../infra/repositories/game.repository.js';
import { colorMap, valueMap } from '../enums/card.enum.js';

/**
 * Service class for handling game-related business logic.
 */
class GameService {
  /**
   * Initializes the GameService with a GameRepository instance.
   */
  constructor() {
    this.gameRepository = new GameRepository();
  }

  /**
   * Retrieves all games from the database
   * @returns {Promise<Array>} Array of all game objects
   * @throws {Error} When database operation fails
   */
  async getAllGames() {
    const games = await this.gameRepository.findAll();
    return games.map((game) => gameResponseDtoSchema.parse(game));
  }

  /**
   * Retrieves a game by its ID
   * @param {string} id - The ID of the game to retrieve
   * @returns {Promise<Object>} The game object if found
   * @throws {Error} When game is not found
   */
  async getGameById(id) {
    const game = await this.gameRepository.findById(id);
    if (!game) {
      throw new Error('Game not found');
    }
    return gameResponseDtoSchema.parse(game);
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
    const { name, rules, maxPlayers } = createGameDtoSchema.parse(gameData);

    const data = {
      title: name,
      rules: rules,
      maxPlayers: maxPlayers,
      creatorId: userId,
      players: [{ _id: userId, ready: true, position: 1 }],
    };

    const game = await this.gameRepository.createGame(data);

    return gameResponseDtoSchema.parse({
      id: game._id.toString(),
      title: game.title,
      rules: game.rules,
      status: game.status,
      maxPlayers: game.maxPlayers,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    });
  }

  /**
   * Updates an existing game with new data
   * @param {string} id - The ID of the game to update
   * @param {Object} updateData - The data to update the game with
   * @returns {Promise<Object>} The updated game object formatted as response DTO
   * @throws {Error} When game is not found or validation fails
   */
  async updateGame(id, updateData) {
    const validatedData = updateGameDtoSchema.parse(updateData);

    const updatedGame = await this.gameRepository.update(id, validatedData);

    if (!updatedGame) {
      throw new Error('Game not found');
    }

    return gameResponseDtoSchema.parse({
      id: updatedGame._id.toString(),
      title: updatedGame.title,
      status: updatedGame.status,
      maxPlayers: updatedGame.maxPlayers,
      createdAt: updatedGame.createdAt,
      updatedAt: updatedGame.updatedAt,
    });
  }

  /**
   * Deletes a game by its ID
   * @param {string} id - The ID of the game to delete
   * @returns {Promise<Object>} The deleted game object
   * @throws {Error} When game is not found
   */
  async deleteGame(id) {
    const game = await this.gameRepository.findById(id);
    if (!game) {
      throw new Error('Game not found');
    }
    return await this.gameRepository.delete(id);
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
    const game = await this.gameRepository.findById(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'Waiting') {
      throw new Error(
        'Game is not accepting new players (Already Active or Ended)',
      );
    }

    if (game.players.length >= game.maxPlayers) {
      throw new Error('Game is full');
    }

    const isAlreadyInGame = game.players.some(
      (p) => p._id.toString() === userId,
    );

    if (isAlreadyInGame) {
      throw new Error('User is already in this game');
    }

    game.players.push({ _id: userId, ready: false, position: 0 });
    await this.gameRepository.save(game);

    return {
      message: 'User joined the game successfully',
      gameId: game._id,
      currentPlayerCount: game.players.length,
    };
  }

  /**
   * Set the given player as ready for the game.
   *
   * @param {string} userId - The ID of the user setting ready.
   * @param {string} gameId - The ID of the game.
   * @returns {Promise<Object>} Object with success message and counts.
   */
  async setPlayerReady(userId, gameId) {
    const game = await this.gameRepository.findById(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'Waiting') {
      throw new Error('Cannot ready now');
    }

    const playerEntry = game.players.find((p) => p._id.toString() === userId);
    if (!playerEntry) {
      throw new Error('You are not in this game');
    }

    if (playerEntry.ready) {
      return {
        success: true,
        message: 'Already ready',
        playersReadyCount: game.players.filter((p) => p.ready).length,
        totalPlayers: game.players.length,
      };
    }

    playerEntry.ready = true;
    await this.gameRepository.save(game);

    return {
      success: true,
      message: 'Player set to ready',
      playersReadyCount: game.players.filter((p) => p.ready).length,
      totalPlayers: game.players.length,
    };
  }

  /**
   * Starts a game.
   * @param {string} userId - The ID of the user starting the game.
   * @param {string} gameId - The ID of the game to start.
   * @returns {Promise<Object>} The started game object.
   */
  async startGame(userId, gameId) {
    const game = await this.gameRepository.findById(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.creatorId.toString() !== userId) {
      throw new Error('Only the game creator can start the game');
    }

    if (game.status === 'Active') {
      throw new Error('Game has already started');
    }

    if (game.players.length < game.minPlayers) {
      throw new Error(`Minimum ${game.minPlayers} players required to start`);
    }

    const notReadyPlayers = game.players.filter((player) => !player.ready);
    if (notReadyPlayers.length > 0) {
      throw new Error('Not all players are ready');
    }

    game.status = 'Active';
    game.players.forEach((player, index) => {
      player.position = index + 1;
    });

    await this.gameRepository.save(game);

    return gameResponseDtoSchema.parse({
      id: game._id.toString(),
      title: game.title,
      status: game.status,
      maxPlayers: game.maxPlayers,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    });
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
    const game = await this.gameRepository.findById(gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    const player = game.players.find((p) => p._id.toString() === userId);
    if (!player) {
      throw new Error('You are not in this game');
    }

    if (game.status !== 'Active') {
      throw new Error('Cannot abandon now');
    }

    game.players = game.players.filter((p) => p._id.toString() !== userId);

    game.players.forEach((p, index) => {
      p.position = index + 1;
    });

    if (game.players.length === 1) {
      game.status = 'Ended';
      game.winnerId = game.players[0]._id;
    }

    await this.gameRepository.save(game);

    return {
      success: true,
      message: 'You left the game',
    };
  }

  /**
   * Retrieves the current status of a game.
   *
   * @param {string} id - The ID of the game to retrieve the status for.
   * @returns {Promise<string>} The status of the game ("Waiting", "Active", "Pause", "Ended").
   * @throws {Error} If the game ID is invalid or the game is not found.
   */
  async getGameStatus(id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid game ID');
    }

    const trimmedId = id.trim();
    const game = await this.gameRepository.findGameStatus(trimmedId);
    if (!game) {
      throw new Error('Game not found');
    }

    return game.status;
  }

  /**
   * Get the top card from the discard pile
   * @param {string} gameId - The game ID
   * @returns {Promise<Object>} Top card information
   * @throws {Error} When game is not found or ID is invalid
   */
  async getDiscardTop(gameId) {
    if (!gameId || typeof gameId !== 'string' || gameId.trim() === '') {
      throw new Error('Invalid game ID');
    }

    const trimmedId = gameId.trim();

    const game = await this.gameRepository.findDiscardTop(trimmedId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status === 'Waiting') {
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
  }

  /**
   * Get discard top with simple response (legacy support)
   * @param {string} gameId - The game ID
   * @returns {Promise<Object>} Simple top card response
   */
  async getDiscardTopSimple(gameId) {
    const result = await this.getDiscardTop(gameId);

    if (result.error) {
      return result;
    }

    if (result.top_card === null) {
      return {
        game_ids: [result.game_id],
        top_cards: [],
      };
    }

    const card = result.current_top_card;
    const color = colorMap[card.color] || card.color;
    const value = valueMap[card.value] || card.value;
    const cardName = `${color} ${value}`;

    return {
      game_ids: [result.game_id],
      top_cards: [cardName],
    };
  }
}

export default GameService;
