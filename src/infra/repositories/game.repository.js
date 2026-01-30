import Game from '../models/game.model.js';

/**
 * Repository class for managing game data operations in the database.
 * Provides CRUD operations for game entities using Mongoose.
 */
class GameRepository {
  /**
   * Retrieves all games from the database
   * @returns {Promise<Array>} Array of all game objects
   * @throws {Error} When database operation fails
   */
  async findAll() {
    return await Game.find();
  }

  /**
   * Creates a new game with the provided game data
   * @param {Object} gameData - The data for creating a new game
   * @returns {Promise<Object>} The created game object
   * @throws {Error} When game creation fails
   */
  async createGame(gameData) {
    const game = new Game(gameData);
    return await game.save();
  }

  /**
   * Retrieves a game by its ID
   * @param {string} id - The ID of the game to retrieve
   * @returns {Promise<Object|null>} The game object if found, null otherwise
   */
  async findById(id) {
    return await Game.findById(id);
  }

  /**
   * Updates a game by its ID with the provided update data
   * @param {string} id - The ID of the game to update
   * @param {Object} updateData - The data to update the game with
   * @returns {Promise<Object|null>} The updated game object if successful, null if not found
   */
  async update(id, updateData) {
    return Game.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  /**
   * Deletes a game by its ID
   * @param {string} id - The ID of the game to delete
   * @returns {Promise<Object|null>} The deleted game object if successful, null if not found
   */
  async delete(id) {
    return await Game.findByIdAndDelete(id);
  }

  /**
   * Saves a game to the database
   * @param {Object} game - The data for creating a new game
   * @returns {Promise<Object>} The created game object
   * @throws {Error} When game creation fails
   */
  async save(game) {
    return await game.save();
  }

  async findGameStatus(id) {
    const game = await Game.findById(id).select('status');
    return game;
  }
}

export default GameRepository;
