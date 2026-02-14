/**
 * Controller to handle score HTTP requests.
 */
class ScoreController {
  /**
   * Initializes the ScoreController with a ScoreService instance.
   * @param scoreService
   */
  constructor(scoreService) {
    this.scoreService = scoreService;
  }

  /**
   * Handles the request to create a new score.
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>}
   */
  async createScore(req, res) {
    const result = await this.scoreService.createScore(req.body);

    result.fold(
      // On failure
      (error) => {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      },
      // On success
      (score) => {
        res.status(201).json({
          success: true,
          data: score,
        });
      },
    );
  }

  /**
   * Handles the request to retrieve all scores.
   * @param {Object} req - The express request object.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>}
   */
  async getAllScores(req, res) {
    const result = await this.scoreService.getAllScores();

    result.fold(
      (error) => {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      },
      (scores) => {
        res.status(200).json({
          success: true,
          data: scores,
        });
      },
    );
  }

  /**
   * Handles the request to update a score.
   * @param req
   * @param res
   */
  async updateScore(req, res) {
    const result = await this.scoreService.updateScore(req.params.id, req.body);

    result.fold(
      (error) => {
        const status = error.message === 'Score not found' ? 404 : 400;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (updatedScore) => {
        res.status(200).json({
          success: true,
          data: updatedScore,
        });
      },
    );
  }

  /**
   * Handles the request to delete a score.
   * @param req
   * @param res
   */
  async deleteScore(req, res) {
    const result = await this.scoreService.deleteScore(req.params.id);

    result.fold(
      (error) => {
        const status = error.message === 'Score not found' ? 404 : 500;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (deletedScore) => {
        res.status(200).json({
          success: true,
          data: deletedScore,
          message: 'Score deleted successfully',
        });
      },
    );
  }
}

export default ScoreController;
