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

  /**
   * Handles the request to update a score.
   * @param req
   * @param res
   */
  async updateScore(req, res) {
    try {
      const updatedScore = await this.scoreService.updateScore(
        req.params.id,
        req.body,
      );
      res.status(200).json({
        success: true,
        data: updatedScore,
      });
    } catch (error) {
      const status = error.message === 'Score not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handles the request to delete a score.
   * @param req
   * @param res
   */
  async deleteScore(req, res) {
    try {
      await this.scoreService.deleteScore(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Score deleted successfully',
      });
    } catch (error) {
      const status = error.message === 'Score not found' ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default ScoreController;
