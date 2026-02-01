import ScoreRepository from '../../infra/repositories/score.repository.js';

/**
 * Service to handle score business logic.
 */
class ScoreService {
  /**
   * Initializes the ScoreService with a ScoreRepository instance.
   */
  constructor() {
    this.scoreRepository = new ScoreRepository();
  }

  /**
   * Creates a new score entry in the database.
   * @param {Object} scoreData - The data to create the score.
   * @returns {Promise<Object>} The created score document.
   */
  async createScore(scoreData) {
    return await this.scoreRepository.create(scoreData);
  }

  /**
   * Retrieves all scores from the database, populated with player info.
   * @returns {Promise<Array>} A list of scores sorted by date.
   */
  async getAllScores() {
    return await this.scoreRepository.findAll();
  }

  /**
   * Updates a score entry in the database.
   * @param {string} id - The ID of the score to update.
   * @param {Object} scoreData - The data to update the score.
   * @returns {Promise<Object>} The updated score document.
   */
  async updateScore(id, scoreData) {
    const updatedScore = await this.scoreRepository.update(id, scoreData);

    if (!updatedScore) {
      throw new Error('Score not found');
    }

    return updatedScore;
  }

  /**
   * Deletes a score entry from the database.
   * @param {string} id - The ID of the score to delete.
   * @returns {Promise<Object>} The deleted score document.
   */
  async deleteScore(id) {
    const deletedScore = await this.scoreRepository.delete(id);

    if (!deletedScore) {
      throw new Error('Score not found');
    }

    return deletedScore;
  }
}

export default ScoreService;
