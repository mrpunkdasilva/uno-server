import GameService from '../../core/services/game.service.js';

/**
 * Controller class for handling game-related HTTP requests.
 * Manages game CRUD operations including creation, retrieval, updating, and deletion.
 * Provides RESTful API endpoints with proper error handling and response formatting.
 */
class GameController {
  /**
   * Initializes the GameController with a GameService instance.
   */
  constructor() {
    this.gameService = new GameService();
  }

  /**
   * Retrieves all games from the database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and games data or error message
   */
  async getAllGames(req, res) {
    try {
      const games = await this.gameService.getAllGames();
      res.status(200).json({
        success: true,
        data: games,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Creates a new game with the provided game data
   * @param {Object} req - Express request object containing game creation data
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and created game data or error message
   */
  async createGame(req, res) {
    try {
      const game = await this.gameService.createGame(req.body);
      res.status(201).json({
        success: true,
        data: game,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Retrieves a game by its ID
   * @param {Object} req - Express request object containing game ID in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and game data or error message
   */
  async getGameById(req, res) {
    try {
      const game = await this.gameService.getGameById(req.params.id);
      res.status(200).json({
        success: true,
        data: game,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Updates an existing game with new data
   * @param {Object} req - Express request object containing game ID in params and update data in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and updated game data or error message
   */
  async updateGame(req, res) {
    try {
      const updatedGame = await this.gameService.updateGame(
        req.params.id,
        req.body,
      );

      res.status(200).json({
        success: true,
        data: updatedGame,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Deletes a game by its ID
   * @param {Object} req - Express request object containing game ID in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and deletion message or error message
   */
  async deleteGame(req, res) {
    try {
      await this.gameService.deleteGame(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Game deleted successfully',
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Handles the request for a user to join a game.
   * Extracts the user ID from the authenticated token and the game ID from the request body.
   *
   * @param {Object} req - The express request object containing user info and body.
   * @param {Object} res - The express response object.
   * @returns {Promise<void>} JSON response with success status or error message.
   */
  async joinGame(req, res) {
    try {
      // req.user comes from the authMiddleware
      const userId = req.user.id;
      const { gameId } = req.body;

      const result = await this.gameService.joinGame(userId, gameId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      let status = 400;
      if (error.message === 'Game not found') status = 404;
      if (error.message === 'User is already in this game') status = 409;

      res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }
  // US 18: Start game when all players are ready
  /**
   *
   * @param req
   * @param res
   */
  async startGame(req, res) {
    try {
      const { gameId } = req.body;
      const userId = req.userId;

      const game = await this.gameService.startGame(userId, gameId);

      return res.status(200).json({
        message: 'Game started successfully',
        gameId: game.gameId,
        startedAt: game.startedAt,
        totalPlayers: game.players.length,
        gameStatus: game.status,
      });
    } catch (error) {
      console.error('Start game error:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
  // US19 - Allow player to abandon an ongoing game
  /**
   *
   * @param req
   * @param res
   */
  async abandonGame(req, res) {
    try {
      const { gameId } = req.body;
      //const userId = req.userId;

      //const result = await this.gameService.abandonGame(userId, gameId);

      return res.status(200).json({
        success: true,
        message: 'You left the game',
        gameId: gameId,
      });
    } catch (error) {
      console.error('Abandon game error:', error.message);

      // Simple error handling for common cases
      if (
        error.message.includes('not found') ||
        error.message.includes('not in this game')
      ) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes('Cannot abandon')) {
        return res.status(400).json({ error: error.message });
      }

      // Default error
      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}

export default GameController;
