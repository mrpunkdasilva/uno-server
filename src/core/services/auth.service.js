import redisClient from '../../config/redis.js';
import logger from '../../config/logger.js';
import PlayerRepository from '../../infra/repositories/player.repository.js';

import {
  generateToken,
  verifyToken,
  decodeToken,
} from '../../core/utils/token.util.js';
// NOTE: Token logic moved to utility module (previously handled with jwt inside this service)

import {
  comparePassword,
  hashPassword,
} from '../../core/utils/password.util.js';
// NOTE: Password logic moved to utility module (previously used bcrypt directly here)

import AppError from '../../core/errors/AppError.js';
// NOTE: Replaced generic Error with custom AppError for better error abstraction

/**
 * Authentication service for handling user login, logout, token management, and password operations
 * Provides JWT authentication with Redis session storage and token blacklisting
 */
class AuthService {
  /**
   * Constructor
   */
  constructor() {
    this.playerRepository = new PlayerRepository();
  }

  /**
   * Authenticates a user with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's plain text password
   * @returns {Promise<Object>} Authentication result with tokens
   * @throws {Error} When authentication fails
   */
  async login(email, password) {
    try {
      const user = await this.playerRepository.findByEmail(email);

      if (!user) {
        logger.warn(
          `Authentication failed for email: ${email}. User not found.`,
        );
        // NOTE: Previously threw generic Error
        throw new AppError('Invalid credentials', 401);
      }

      // NOTE: Previously used bcrypt.compare directly
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        logger.warn(
          `Authentication failed for email: ${email}. Invalid password.`,
        );
        throw new AppError('Invalid credentials', 401);
      }

      logger.info(`User ${user._id} logged in successfully.`);

      // NOTE: Previously used this.generateToken()
      const accessToken = generateToken(
        { id: user._id },
        process.env.JWT_SECRET,
        '15m',
      );

      const refreshToken = generateToken(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        '7d',
      );

      await redisClient.set(`session:${user._id}`, refreshToken, {
        EX: 7 * 24 * 60 * 60,
      });

      return {
        success: true,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(
        `Login failed for email: ${email} with error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Logs out a user by invalidating their session and blacklisting their access token
   * @param {string} userId - The ID of the user to log out
   * @param {string} accessToken - The access token to blacklist
   * @returns {Promise<Object>} Logout result with success status and message
   * @throws {Error} When logout operation fails
   */
  async logout(userId, accessToken) {
    logger.info(`Attempting to log out user: ${userId}`);

    await redisClient.del(`session:${userId}`);

    if (accessToken) {
      // NOTE: Previously used jwt.decode directly
      const decoded = decodeToken(accessToken);

      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const timeToLive = decoded.exp - currentTime;

        if (timeToLive > 0) {
          await redisClient.set(`blacklist:${accessToken}`, 'blacklisted', {
            EX: timeToLive,
          });

          logger.info(
            `Access token for user ${userId} blacklisted successfully.`,
          );
        }
      }
    }

    logger.info(`User ${userId} logged out successfully.`);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Refreshes an access token using a valid refresh token
   * @param {string} refreshToken - The refresh token to validate and use for generating new access token
   * @returns {Promise<Object>} Object containing success status and new access token
   * @throws {AppError} When refresh token is invalid, expired, or revoked
   */
  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        logger.warn('Refresh token request missing refresh token.');
        throw new AppError('Refresh token is required', 400);
      }

      let decoded;
      try {
        // NOTE: Previously used jwt.verify directly
        decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (error) {
        // NOTE: Handle specific JWT errors with appropriate messages
        if (error.name === 'TokenExpiredError') {
          logger.warn(`Expired refresh token detected: ${error.message}`);
          throw new AppError('Refresh token has expired', 401);
        }
        if (error.name === 'JsonWebTokenError') {
          logger.warn(`Invalid refresh token detected: ${error.message}`);
          throw new AppError('Invalid refresh token', 401);
        }
        // Re-throw unexpected errors
        logger.error(
          `Unexpected error during token verification: ${error.message}`,
        );
        throw error;
      }

      // NOTE: Ensure decoded token has id field
      if (!decoded || !decoded.id) {
        logger.warn('Invalid refresh token payload: missing id');
        throw new AppError('Invalid refresh token', 401);
      }

      logger.info(`Refresh token received for user ID: ${decoded.id}`);

      const storedToken = await redisClient.get(`session:${decoded.id}`);

      if (!storedToken) {
        logger.warn(`No session found for user ID: ${decoded.id}`);
        throw new AppError('Refresh token invalid or revoked', 401);
      }

      if (storedToken !== refreshToken) {
        logger.warn(`Token mismatch for user ID: ${decoded.id}`);
        throw new AppError('Refresh token invalid or revoked', 401);
      }

      const newToken = generateToken(
        { id: decoded.id },
        process.env.JWT_SECRET,
        '15m',
      );

      logger.info(`New access token generated for user ID: ${decoded.id}`);

      return {
        success: true,
        token: newToken,
      };
    } catch (error) {
      // NOTE: Log error but don't expose internal details
      logger.error(`Token refresh failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hashes a password using bcrypt
   * @param {string} password - Plain text password to hash
   * @returns {Promise<string>} Hashed password
   * @throws {Error} When password hashing fails
   */
  async hashPassword(password) {
    logger.info('Hashing password...');
    // NOTE: Delegated to password utility instead of using bcrypt directly
    return await hashPassword(password);
  }

  /**
   * Checks if a token is blacklisted in Redis
   * @param {string} token - JWT token to check against blacklist
   * @returns {Promise<boolean>} True if token is blacklisted, false otherwise
   */
  async verifyTokenIsBlacklisted(token) {
    logger.info('Checking if token is blacklisted...');
    return await redisClient.get(`blacklist:${token}`);
  }
}

export default AuthService;
