import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import redisClient from '../../config/redis.js';
import PlayerRepository from '../../infra/repositories/player.repository.js';

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
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      const accessToken = this.generateToken(
        user,
        process.env.JWT_SECRET,
        '15m',
      );
      const refreshToken = this.generateToken(
        user,
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
      throw new Error('Authentication failed: ' + error.message);
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
    await redisClient.del(`session:${userId}`);

    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          const timeToLive = decoded.exp - currentTime;
          if (timeToLive > 0) {
            await redisClient.set(`blacklist:${accessToken}`, 'blacklisted', {
              EX: timeToLive,
            });
          }
        }
      } catch (error) {
        console.error('Error adding token in blacklist');
      }
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Refreshes an access token using a valid refresh token
   * @param {string} refreshToken - The refresh token to validate and use for generating new access token
   * @returns {Promise<Object>} Object containing success status and new access token
   * @throws {Error} When refresh token is invalid, expired, or revoked
   */
  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new Error('Refresh token is required');
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      const storedToken = await redisClient.get(`session:${decoded.id}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Refresh token invalid or revoked');
      }

      const newToken = this.generateToken(
        { id: decoded.id },
        process.env.JWT_SECRET,
        '15m',
      );

      return {
        success: true,
        token: newToken,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw new Error('Token refresh failed: ' + error.message);
    }
  }

  /**
   * Generates a JWT token for a user
   * @param {Object} user - User object containing user information
   * @param {string} secret - Secret key used to sign the token
   * @param {string} expiresIn - Token expiration time (e.g., '15m', '7d')
   * @returns {string} Generated JWT token
   */
  generateToken(user, secret, expiresIn) {
    const payload = {
      id: user._id,
    };

    return jwt.sign(payload, secret, { expiresIn: expiresIn });
  }

  /**
   * Verifies a JWT token and returns the decoded payload
   * @param {string} token - JWT token to verify
   * @param {string} secret - Secret key used to verify the token
   * @returns {Object} Decoded token payload
   * @throws {Error} When token is invalid, expired, or malformed
   */
  verifyToken(token, secret) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed: ' + error.message);
    }
  }

  /**
   * Hashes a password using bcrypt
   * @param {string} password - Plain text password to hash
   * @returns {Promise<string>} Hashed password
   * @throws {Error} When password hashing fails
   */
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Checks if a token is blacklisted in Redis
   * @param {string} token - JWT token to check against blacklist
   * @returns {Promise<boolean>} True if token is blacklisted, false otherwise
   */
  async verifyTokenIsBlacklisted(token) {
    return await redisClient.get(`blacklist:${token}`);
  }
}

export default AuthService;
