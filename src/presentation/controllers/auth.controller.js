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
   */
  async register(req, res) {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      throw new AppError('Email, password and username are required', 400);
    }

    const playerData = { email, password, username };
    const newPlayer = await this.playerService.createPlayer(playerData);

    res.status(201).json({
      success: true,
      data: newPlayer,
      message: 'Player registered successfully',
    });
  }

  /**
   * Authenticates a player with email and password credentials
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
   */
  async getAuthenticatedPlayerProfile(req, res) {
    const userId = req.user.id;

    const player = await this.playerService.getPlayerById(userId);

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    res.status(200).json({
      success: true,
      data: player,
    });
  }
}

export default AuthController;