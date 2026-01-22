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

  /**
   *
   * @param id
   * @param scoreData
   */
  async updateScore(id, scoreData) {
    // new: true retorna o objeto já atualizado
    const updatedScore = await ScoreModel.findByIdAndUpdate(id, scoreData, {
      new: true,
    });

    if (!updatedScore) {
      throw new Error('Score not found');
    }

    return updatedScore;
  }

  /**
   *
   * @param id
   */
  async deleteScore(id) {
    const deletedScore = await ScoreModel.findByIdAndDelete(id);

    if (!deletedScore) {
      throw new Error('Score not found');
    }

    return deletedScore;
  }
}

export default ScoreService;
