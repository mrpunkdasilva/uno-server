import AppError from '../../core/errors/AppError.js';

/**
 * Global error handling middleware.
 * Captures all errors thrown in the application and returns
 * standardized JSON responses.
 * @param err
 * @param req
 * @param res
 * @param next
 */
// eslint-disable-next-line no-unused-vars
export default function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
