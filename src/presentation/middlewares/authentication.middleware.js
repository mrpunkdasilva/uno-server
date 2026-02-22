import jwt from 'jsonwebtoken';
import logger from '../../config/logger.js';
import AppError from '../../core/errors/AppError.js';
import AuthService from '../../core/services/auth.service.js';

const authService = new AuthService();

/**
 * Authentication middleware that validates JWT tokens.
 * Passes errors to the global error middleware for consistent logging.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn(
        {
          req: {
            id: req.id,
            method: req.method,
            url: req.url,
            ip: req.ip,
          },
        },
        'Authentication failed: Missing authorization header',
      );
      throw new AppError('Authorization header is required', 401);
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      logger.warn(
        {
          req: {
            id: req.id,
            method: req.method,
            url: req.url,
            ip: req.ip,
          },
        },
        'Authentication failed: Missing token',
      );
      throw new AppError('Token is required', 401);
    }

    // Check if token is blacklisted
    const isTokenBlacklisted = await authService.verifyTokenIsBlacklisted(
      token,
    );

    if (isTokenBlacklisted) {
      logger.warn(
        {
          req: {
            id: req.id,
            method: req.method,
            url: req.url,
            ip: req.ip,
          },
          tokenPrefix: token.substring(0, 10) + '...',
        },
        'Authentication failed: Token is blacklisted',
      );
      throw new AppError('Token invalidated', 401);
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    logger.debug(
      {
        userId: decoded.id,
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'User authenticated successfully',
    );

    next();
  } catch (error) {
    // JWT-specific errors
    if (error.name === 'JsonWebTokenError') {
      logger.warn(
        {
          err: {
            type: error.name,
            message: error.message,
          },
          req: {
            id: req.id,
            method: req.method,
            url: req.url,
            ip: req.ip,
          },
        },
        'Authentication failed: Invalid JWT',
      );
      // Pass to error middleware
      return next(new AppError('Invalid token', 401));
    }

    if (error.name === 'TokenExpiredError') {
      logger.warn(
        {
          err: {
            type: error.name,
            message: error.message,
            expiredAt: error.expiredAt,
          },
          req: {
            id: req.id,
            method: req.method,
            url: req.url,
            ip: req.ip,
          },
        },
        'Authentication failed: Token expired',
      );
      // Pass to error middleware
      return next(new AppError('Token has expired', 401));
    }

    // If it's already an AppError, pass it through
    if (error instanceof AppError) {
      return next(error);
    }

    // Unexpected authentication error
    logger.error(
      {
        err: error,
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
          ip: req.ip,
        },
      },
      'Unexpected authentication error',
    );

    // Pass to error middleware
    next(new AppError('Authentication error', 500));
  }
};
