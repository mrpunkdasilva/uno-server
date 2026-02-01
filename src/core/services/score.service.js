import logger from '../../config/logger.js';
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
    logger.info(
      `Attempting to create a new score entry for player ${scoreData.playerId}.`,
    );
    try {
      const newScore = await this.scoreRepository.create(scoreData);
      logger.info(
        `Score created successfully for player ${scoreData.playerId} with ID ${newScore._id}.`,
      );
      return newScore;
    } catch (error) {
      logger.error(
        `Failed to create score for player ${scoreData.playerId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves all scores from the database, populated with player info.
   * @returns {Promise<Array>} A list of scores sorted by date.
   */
  async getAllScores() {
    logger.info('Attempting to retrieve all scores.');
    try {
      const scores = await this.scoreRepository.findAll();
      logger.info(`Successfully retrieved ${scores.length} scores.`);
      return scores;
    } catch (error) {
      logger.error(`Failed to retrieve all scores: ${error.message}`);
      throw error;
    }
  }

  /**
   * Updates a score entry in the database.
   * @param {string} id - The ID of the score to update.
   * @param {Object} scoreData - The data to update the score.
   * @returns {Promise<Object>} The updated score document.
   */
  async updateScore(id, scoreData) {
    logger.info(`Attempting to update score with ID: ${id}`);
    try {
      const updatedScore = await this.scoreRepository.update(id, scoreData);

      if (!updatedScore) {
        logger.warn(`Score with ID ${id} not found for update.`);
        throw new Error('Score not found');
      }

      logger.info(`Score with ID ${id} updated successfully.`);
      return updatedScore;
    } catch (error) {
      logger.error(`Failed to update score with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a score entry from the database.
   * @param {string} id - The ID of the score to delete.
   * @returns {Promise<Object>} The deleted score document.
   */
  async deleteScore(id) {
    logger.info(`Attempting to delete score with ID: ${id}`);
    try {
      const deletedScore = await this.scoreRepository.delete(id);

      if (!deletedScore) {
        logger.warn(`Score with ID ${id} not found for deletion.`);
        throw new Error('Score not found');
      }

      logger.info(`Score with ID ${id} deleted successfully.`);
      return deletedScore;
    } catch (error) {
      logger.error(`Failed to delete score with ID ${id}: ${error.message}`);
      throw error;
    }
  }
}

export default ScoreService;
