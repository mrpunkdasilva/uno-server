import ScoreService from '../../core/services/score.service.js';

/**
 * Controller to handle score HTTP requests.
 */
class ScoreController {
  /**
   * Initializes the ScoreController with a ScoreService instance.
   */
  constructor() {
    this.scoreService = new ScoreService();
  }

  /**
   * Handles the request to create a new score.
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>}
   */
  async createScore(req, res) {
    try {
      const score = await this.scoreService.createScore(req.body);
      res.status(201).json({
        success: true,
        data: score,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handles the request to retrieve all scores.
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>}
   */
  async getAllScores(req, res) {
    try {
      const scores = await this.scoreService.getAllScores();
      res.status(200).json({
        success: true,
        data: scores,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default ScoreController;
