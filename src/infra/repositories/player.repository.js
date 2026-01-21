import Player from '../models/player.model.js';

/**
 * Repository class for managing player data operations in the database.
 * Provides CRUD operations for player entities using Mongoose.
 */
class PlayerRepository {
  /**
   * Retrieves all players from the database
   * @returns {Promise<Array>} Array of all player objects
   */
  async findAll() {
    return await Player.find();
  }

  /**
   * Creates a new player with the provided player data
   * @param {Object} playerData - The data for creating a new player
   * @returns {Promise<Object>} The created player object
   * @throws {Error} When player creation fails
   */
  async create(playerData) {
    const player = new Player(playerData);
    return await player.save();
  }

  /**
   * Retrieves a player by their ID
   * @param {string} id - The ID of the player to retrieve
   * @returns {Promise<Object|null>} The player object if found, null otherwise
   */
  async findById(id) {
    return await Player.findById(id);
  }

  /**
   * Retrieves a player by their email address
   * @param {string} email - The email address of the player to retrieve
   * @returns {Promise<Object|null>} The player object if found, null otherwise
   */
  async findByEmail(email) {
    return await Player.findOne({ email });
  }

  /**
   * Retrieves a player by their username
   * @param {string} username - The username of the player to retrieve
   * @returns {Promise<Object|null>} The player object if found, null otherwise
   */
  async findByUsername(username) {
    return await Player.findOne({ username });
  }

  /**
   * Updates a player by their ID with the provided update data
   * @param {string} id - The ID of the player to update
   * @param {Object} updateData - The data to update the player with
   * @returns {Promise<Object|null>} The updated player object if successful, null if not found
   */
  async update(id, updateData) {
    return await Player.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Deletes a player by their ID
   * @param {string} id - The ID of the player to delete
   * @returns {Promise<Object|null>} The deleted player object if successful, null if not found
   */
  async delete(id) {
    return await Player.findByIdAndDelete(id);
  }
}

export default PlayerRepository;
