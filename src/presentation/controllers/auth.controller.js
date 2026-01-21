import AuthService from '../../core/services/auth.service.js';
import PlayerService from '../../core/services/player.service.js';

/**
 * Controller class for handling authentication-related HTTP requests.
 * Manages user registration, login, logout, token refresh, and profile retrieval.
 * Provides RESTful API endpoints with proper error handling and response formatting.
 */
class AuthController {
  /**
   *
   */
  constructor() {
    this.authService = new AuthService();
    this.playerService = new PlayerService();
  }

  /**
   * Registers a new player with email, password, and username
   * @param {Object} req - Express request object containing player registration data
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and player data or error message
   */
  async register(req, res) {
    try {
      const { email, password, username } = req.body;

      if (!email || !password || !username) {
        return res.status(400).json({
          success: false,
          message: 'Email, password and username are required',
        });
      }

      const playerData = { email, password, username };
      const newPlayer = await this.playerService.createPlayer(playerData);

      res.status(201).json({
        success: true,
        data: newPlayer,
        message: 'Player registered successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Authenticates a player with email and password credentials
   * @param {Object} req - Express request object containing login credentials
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with authentication tokens or error message
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const result = await this.authService.login(email, password);

      res.status(200).json(result);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Logs out an authenticated player by invalidating their session and blacklisting their access token
   * @param {Object} req - Express request object containing authorization header and user data
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and logout message or error message
   */
  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Authorization header is required',
        });
      }

      const token = authHeader.split(' ')[1]; // Bearer <token>
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token is required',
        });
      }

      await this.authService.logout(req.user.id, token);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Refreshes an access token using a valid refresh token
   * @param {Object} req - Express request object containing refresh token in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with new access token or error message
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const token = await this.authService.refreshToken(refreshToken);
      res.status(200).json(token);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Retrieves the authenticated player's profile information
   * @param {Object} req - Express request object containing authenticated user data
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with player profile data or error message
   */
  async getAuthenticatedPlayerProfile(req, res) {
    try {
      const userId = req.user.id;

      const player = await this.playerService.getPlayerById(userId);

      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found',
        });
      }

      res.status(200).json({
        success: true,
        data: player,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default AuthController;
