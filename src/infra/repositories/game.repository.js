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

  /**
   * Finds a game by its ID and returns only its status.
   *
   * @param {string} id - The ID of the game to find.
   * @returns {Promise<Object|null>} An object containing the game's status if found, null otherwise.
   */
  async findGameStatus(id) {
    const game = await Game.findById(id).select('status');
    return game;
  }

  /**
   * Retrieves the top card from the discard pile for a specific game
   * @param {string} id - The game ID
   * @returns {Promise<Object|null>} The top card object if found, null otherwise
   */
  async findDiscardTop(id) {
    return await Game.findById(id)
      .select('discardPile initialCard status')
      .lean();
  }

  /**
   * Retrieves recent cards from discard pile (last N cards)
   * @param {string} id - The game ID
   * @param {number} limit - Maximum number of recent cards to return
   * @returns {Promise<Object|null>} Game object with discard pile information
   */
  async findRecentDiscards(id, limit = 5) {
    return await Game.findById(id)
      .select('discardPile initialCard status')
      .slice('discardPile', -limit) // Get last N cards
      .lean();
  }

  /**
   * Adds a card to the discard pile
   * @param {string} gameId - The game ID
   * @param {Object} cardData - The card data to add
   * @returns {Promise<Object|null>} Updated game object
   */
  async addToDiscardPile(gameId, cardData) {
    return await Game.findByIdAndUpdate(
      gameId,
      {
        $push: {
          discardPile: {
            ...cardData,
            order: { $inc: { discardOrder: 1 } }, // Auto-increment order
          },
        },
      },
      { new: true },
    );
  }

  /**
   * Clears the discard pile (for game reset or end)
   * @param {string} gameId - The game ID
   * @returns {Promise<Object|null>} Updated game object
   */
  async clearDiscardPile(gameId) {
    return await Game.findByIdAndUpdate(
      gameId,
      { $set: { discardPile: [] } },
      { new: true },
    );
  }

  /**
   * Gets discard pile size
   * @param {string} gameId - The game ID
   * @returns {Promise<number>} Size of discard pile
   */
  async getDiscardPileSize(gameId) {
    const game = await Game.findById(gameId).select('discardPile').lean();

    return game?.discardPile?.length || 0;
  }

  /**
   * Retrieves players from a specific game
   * @param {string} gameId - The ID of the game
   * @returns {Promise<Array>} Array of player objects in the game
   */
  async findPlayersByGameId(gameId) {
    return await Game.findById(gameId)
      .select('players')
      .populate('players._id', 'username email')
      .lean();
  }
}

export default GameRepository;
