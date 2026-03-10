import AuthService from '../../core/services/auth.service.js';
import PlayerService from '../../core/services/player.service.js';
import AppError from '../../core/errors/AppError.js';

/**
 * Controller class for handling authentication-related HTTP requests.
 * Manages user registration, login, logout, token refresh, and profile retrieval.
 * Provides RESTful API endpoints with proper error handling and response formatting.
 */
class AuthController {
  /**
   * Initializes AuthController with instances of AuthService and PlayerService.
   */
  constructor() {
    this.authService = new AuthService();
    this.playerService = new PlayerService();
  }

  /**
   * Registers a new player with email, password, and username
   * @param req
   * @param res
   */
  async register(req, res) {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, password and username are required',
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const playerData = { email, password, username };
    const result = await this.playerService.createPlayer(playerData);

    result.fold(
      (error) => {
        const status = error.statusCode || 400;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (result) => {
        const player = result._value || result;
        res.status(201).json({
          success: true,
          player: player,
          message: 'Player registered successfully',
        });
      },
    );
  }

  /**
   * Authenticates a player with email and password credentials
   * @param req
   * @param res
   */
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const result = await this.authService.login(email, password);

    res.status(200).json(result);
  }

  /**
   * Logs out an authenticated player
   * @param req
   * @param res
   */
  async logout(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('Authorization header is required', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Token is required', 401);
    }

    await this.authService.logout(req.user.id, token);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  }

  /**
   * Refreshes an access token using a valid refresh token
   * @param req
   * @param res
   */
  async refreshToken(req, res) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const token = await this.authService.refreshToken(refreshToken);

    res.status(200).json(token);
  }

  /**
   * Retrieves the authenticated player's profile information
   * @param req
   * @param res
   */
  async getAuthenticatedPlayerProfile(req, res) {
    const userId = req.user.id;

    const result = await this.playerService.getPlayerById(userId);

    result.fold(
      (error) => {
        const status = error.message === 'Player not found' ? 404 : 500;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (result) => {
        const player = result._value || result;
        res.status(200).json(player);
      },
    );
  }
}

export default AuthController;
