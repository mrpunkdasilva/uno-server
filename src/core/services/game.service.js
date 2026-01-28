import gameResponseDtoSchema from '../../presentation/dtos/gameResponse.dto.js';
import updateGameDtoSchema from '../../presentation/dtos/updateGame.dto.js';
import GameRepository from '../../infra/repositories/game.repository.js';

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
    return await this.gameRepository.findAll();
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
    return game;
  }

  /**
   * Creates a new game with the provided game data
   * @param {Object} gameData - The data for creating a new game
   * @returns {Promise<Object>} The created game object formatted as response DTO
   * @throws {Error} When game creation fails or validation errors occur
   */
  async createGame(gameData) {
    const game = await this.gameRepository.createGame(gameData);

    // transforma em DTO de resposta
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

    // Check if user is already in the game (comparing string IDs)
    const isAlreadyInGame = game.players.some(
      (p) => p._id.toString() === userId || p.toString() === userId,
    );

    if (isAlreadyInGame) {
      throw new Error('User is already in this game');
    }

    game.players.push(userId);
    await game.save();

    return {
      message: 'User joined the game successfully',
      gameId: game._id,
      currentPlayerCount: game.players.length,
    };
  }
  async startGame(userId, gameId) {
    // Find the game in database
        const game = await this.gameRepository.findById(gameId);

        if (!game) {
            throw new Error( 
                'Game not found' 
            );
        }
        
        // Check if user is the game creator
        if (game.creatorId !== userId) {
           throw new Error( 
              'Only the game creator can start the game' 
            );
        }
        
        // Check if game is already started
        if (game.status === 'in_progress') {
            throw new Error( 
                'Game has already started' 
            );
        }
        
        // Check minimum number of players
        if (game.players.length < game.minPlayers) {
            throw new Error( 
                'Minimum ' + game.minPlayers + ' players required to start'
            );
        }
        
        // Check if all players are ready
        const notReadyPlayers = game.players.filter(player => !player.ready);
        if (notReadyPlayers.length > 0) {
           throw new Error(
                'Not all players are ready'
            );
        }
        
        // Update game status to in_progress
        game.status = 'in_progress';
        game.startedAt = new Date();
        
        // Initialize game positions
        game.players.forEach((player, index) => {
            player.position = index + 1;
        });
        
        // Save game changes
       return await this.gameRepository.update(gameId,game);
        
        
    
  }
  
}
export default GameService;
