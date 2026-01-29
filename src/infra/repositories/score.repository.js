import { ScoreModel } from '../models/score.model.js';

/**
 * Repository class for managing score data operations in the database.
 * Provides CRUD operations and some query helpers for score entities using Mongoose.
 */
class ScoreRepository {
  /**
   * Retrieves all score documents from the database.
   * @returns {Promise<Array>} Array of all score objects
   */
  async findAll() {
    return await ScoreModel.find();
  }

  /**
   * Retrieves a score by its ID
   * @param {string} id - The ID of the score to retrieve
   * @returns {Promise<Object|null>} The score object if found, null otherwise
   */
  async findById(id) {
    return await ScoreModel.findById(id);
  }

  /**
   * Retrieves scores for a specific player
   * @param {string} playerId - The player's ObjectId
   * @returns {Promise<Array>} Array of score objects for the player
   */
  async findByPlayerId(playerId) {
    return await ScoreModel.find({ playerId });
  }

  /**
   * Retrieves scores for a specific match
   * @param {string} matchId - Identifier of the match
   * @returns {Promise<Array>} Array of score objects for the match
   */
  async findByMatchId(matchId) {
    return await ScoreModel.find({ matchId });
  }

  /**
   * Creates a new score document with the provided data
   * @param {Object} scoreData - The data for creating a new score
   * @returns {Promise<Object>} The created score object
   */
  async create(scoreData) {
    const score = new ScoreModel(scoreData);
    return await score.save();
  }

  /**
   * Updates a score by its ID with the provided update data
   * @param {string} id - The ID of the score to update
   * @param {Object} updateData - The data to update the score with
   * @returns {Promise<Object|null>} The updated score object if successful, null if not found
   */
  async update(id, updateData) {
    return await ScoreModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  /**
   * Deletes a score by its ID
   * @param {string} id - The ID of the score to delete
   * @returns {Promise<Object|null>} The deleted score object if successful, null if not found
   */
  async delete(id) {
    return await ScoreModel.findByIdAndDelete(id);
  }
}

export default ScoreRepository;
