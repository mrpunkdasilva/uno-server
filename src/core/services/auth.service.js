import redisClient from '../../config/redis.js';
import logger from '../../config/logger.js';
import PlayerRepository from '../../infra/repositories/player.repository.js';

import {
  generateToken,
  verifyToken,
  decodeToken,
} from '../../core/utils/token.util.js';
import {
  comparePassword,
  hashPassword,
} from '../../core/utils/password.util.js';
import { AppError } from '../../core/errors/AppError.js';

class AuthService {
  constructor() {
    this.playerRepository = new PlayerRepository();
  }

  async login(email, password) {
    try {
      const user = await this.playerRepository.findByEmail(email);

      if (!user) {
        logger.warn(
          `Authentication failed for email: ${email}. User not found.`,
        );
        throw new AppError('Invalid credentials', 401);
      }

      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        logger.warn(
          `Authentication failed for email: ${email}. Invalid password.`,
        );
        throw new AppError('Invalid credentials', 401);
      }

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

      logger.info(`User ${user._id} logged in successfully.`);

      return {
        success: true,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(`Login failed for email: ${email} - ${error.message}`);
      throw error;
    }
  }

  async logout(userId, accessToken) {
    logger.info(`Attempting logout for user: ${userId}`);

    await redisClient.del(`session:${userId}`);

    if (accessToken) {
      const decoded = decodeToken(accessToken);

      if (decoded && decoded.exp) {
        const currentTime = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - currentTime;

        if (ttl > 0) {
          await redisClient.set(`blacklist:${accessToken}`, 'blacklisted', {
            EX: ttl,
          });
        }
      }
    }

    logger.info(`User ${userId} logged out successfully.`);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);

      const storedToken = await redisClient.get(`session:${decoded.id}`);

      if (!storedToken || storedToken !== refreshToken) {
        throw new AppError('Refresh token invalid or revoked', 401);
      }

      const newToken = generateToken(
        { id: decoded.id },
        process.env.JWT_SECRET,
        '15m',
      );

      return {
        success: true,
        token: newToken,
      };
    } catch (error) {
      logger.error(`Refresh token error: ${error.message}`);
      throw error;
    }
  }

  async hashPassword(password) {
    return hashPassword(password);
  }

  async verifyTokenIsBlacklisted(token) {
    return await redisClient.get(`blacklist:${token}`);
  }
}

export default AuthService;
