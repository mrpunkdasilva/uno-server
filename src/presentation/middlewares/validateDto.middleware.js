import logger from '../../config/logger.js';
import AppError from '../../core/errors/AppError.js';

/**
 * Middleware factory for validating request DTOs using Zod schemas.
 * Passes validation errors to the global error middleware for consistent logging.
 *
 * @param {object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateDto = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Extract error messages from Zod errors
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      logger.warn(
        {
          req: {
            id: req.id,
            method: req.method,
            url: req.url,
            body: req.body,
          },
          validation: {
            errors: result.error.errors,
            formattedErrors: result.error.format(),
          },
        },
        `DTO validation failed: ${errorMessages}`,
      );

      // Create a custom ZodError-like error that the error middleware can handle
      const validationError = new Error(errorMessages);
      validationError.name = 'ZodError';
      validationError.errors = result.error.errors;

      return next(validationError);
    }

    // Validation successful - replace req.body with parsed/validated data
    req.body = result.data;

    logger.debug(
      {
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'DTO validation passed',
    );

    next();
  } catch (error) {
    logger.error(
      {
        err: error,
        req: {
          id: req.id,
          method: req.method,
          url: req.url,
        },
      },
      'Unexpected error in DTO validation middleware',
    );

    next(new AppError('Validation error', 400));
  }
};

export default validateDto;
