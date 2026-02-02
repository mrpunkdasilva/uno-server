import PlayerService from '../../core/services/player.service.js';

/**
 * Controller class for handling player-related HTTP requests.
 * Manages player CRUD operations including creation, retrieval, updating, and deletion.
 */
class PlayerController {
  /**
   * Initializes the PlayerController with a PlayerService instance.
   */
  constructor() {
    this.playerService = new PlayerService();
  }

  /**
   * Retrieves all players from the database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and players data or error message
   */
  async getAllPlayers(req, res) {
    try {
      const players = await this.playerService.getAllPlayers();
      res.status(200).json({
        success: true,
        data: players,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Creates a new player with the provided player data
   * @param {Object} req - Express request object containing player creation data in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and created player data or error message
   */
  async createPlayer(req, res) {
    try {
      const { email, password, username } = req.body;
      if (!email || !password || !username) {
        return res.status(400).json({
          success: false,
          message: 'Email, password and username are required',
        });
      }
      const player = await this.playerService.createPlayer(req.body);
      res.status(201).json({
        success: true,
        data: player,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Retrieves a player by their ID
   * @param {Object} req - Express request object containing player ID in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and player data or error message
   */
  async getPlayerById(req, res) {
    try {
      const player = await this.playerService.getPlayerById(req.params.id);
      res.status(200).json({
        success: true,
        data: player,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Updates an existing player with new data
   * @param {Object} req - Express request object containing player ID in params and update data in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and updated player data or error message
   */
  async updatePlayer(req, res) {
    try {
      const player = await this.playerService.updatePlayer(
        req.params.id,
        req.body,
      );
      res.status(200).json({
        success: true,
        data: player,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Deletes a player by their ID
   * @param {Object} req - Express request object containing player ID in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and deletion message or error message
   */
  async deletePlayer(req, res) {
    try {
      await this.playerService.deletePlayer(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Player deleted successfully',
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default PlayerController;
