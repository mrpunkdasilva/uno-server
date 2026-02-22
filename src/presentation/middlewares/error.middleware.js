import logger from '../../config/logger.js';
import AppError from '../../core/errors/AppError.js';

/**
 * Global error handling middleware with Pino logging.
 * Captures all errors thrown in the application and returns
 * standardized JSON responses with proper logging.
 *
 * @param {Error} err - The error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
// eslint-disable-next-line no-unused-vars
export default function errorMiddleware(err, req, res, next) {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // Handle known AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = true;

    // Log operational errors at warn level
    logger.warn(
      {
        err: {
          type: err.name,
          message: err.message,
          statusCode: err.statusCode,
        },
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
          userId: req.user?.id,
        },
      },
      `Operational error: ${message}`,
    );

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    isOperational = true;

    logger.warn(
      {
        err: {
          type: 'ValidationError',
          message,
          errors: err.errors,
        },
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'Validation error',
    );

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    isOperational = true;

    logger.warn(
      {
        err: {
          type: 'CastError',
          message,
          path: err.path,
          value: err.value,
        },
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'Cast error',
    );

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;

    logger.warn(
      {
        err: {
          type: 'JsonWebTokenError',
          message: err.message,
        },
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'JWT error',
    );

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;

    logger.warn(
      {
        err: {
          type: 'TokenExpiredError',
          message: err.message,
          expiredAt: err.expiredAt,
        },
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'Token expired',
    );

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = err.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    isOperational = true;

    logger.warn(
      {
        err: {
          type: 'ZodError',
          message,
          errors: err.errors,
        },
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'Zod validation error',
    );

    return res.status(statusCode).json({
      success: false,
      message,
      errors: err.errors,
    });
  }

  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    statusCode = 409;
    message = `${field} already exists`;
    isOperational = true;

    logger.warn(
      {
        err: {
          type: 'DuplicateKeyError',
          message,
          field,
          value: err.keyValue[field],
        },
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'Duplicate key error',
    );

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  // Log unexpected/programming errors at error level with full stack trace
  logger.error(
    {
      err: {
        type: err.name,
        message: err.message,
        stack: err.stack,
        statusCode,
        isOperational,
      },
      req: {
        id: req.id,
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        userId: req.user?.id,
      },
    },
    `Unhandled error: ${err.message}`,
  );

  // In development, send stack trace
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      message,
      error: err.message,
      stack: err.stack,
    });
  }

  // In production, hide error details
  return res.status(statusCode).json({
    success: false,
    message: 'Internal server error',
  });
}
