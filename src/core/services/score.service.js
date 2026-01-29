import { ScoreRepository } from '../../infra/repositories/score.repository.js';

/**
 * Service to handle score business logic.
 */
class ScoreService {
  constructor() {
    this.scoreRepository = new ScoreRepository();
  }

  /**
   * Creates a new score entry in the database.
   * @param {Object} scoreData - The data to create the score.
   * @returns {Promise<Object>} The created score document.
   */
  async createScore(scoreData) {
    const score = await this.scoreRepository.create(scoreData);
    return score;
  }

  /**
   * Retrieves all scores from the database, populated with player info.
   * @returns {Promise<Array>} A list of scores sorted by date.
   */
  async getAllScores() {
    const scores = await this.scoreRepository.getAll();
    return scores;
  }

  /**
   *
   * @param id
   * @param scoreData
   */
  async updateScore(id, scoreData) {
    // new: true retorna o objeto já atualizado
    const updatedScore = await this.scoreRepository.update(id, scoreData);

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
    const deletedScore = await this.scoreRepository.delete(id);

    if (!deletedScore) {
      throw new Error('Score not found');
    }

    return deletedScore;
  }
}

export default ScoreService;
