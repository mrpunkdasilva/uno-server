import { ScoreModel } from '../../infra/models/score.model.js';

/**
 * Service to handle score business logic.
 */
class ScoreService {
  /**
   * Creates a new score entry in the database.
   * @param {Object} scoreData - The data to create the score.
   * @returns {Promise<Object>} The created score document.
   */
  async createScore(scoreData) {
    const score = await ScoreModel.create(scoreData);
    return score;
  }

  /**
   * Retrieves all scores from the database, populated with player info.
   * @returns {Promise<Array>} A list of scores sorted by date.
   */
  async getAllScores() {
    const scores = await ScoreModel.find()
      .populate('playerId', 'username email')
      .sort({ createdAt: -1 });

    return scores;
  }
}

export default ScoreService;
