import logger from '../../config/logger.js';
import ApiUsageRepository from '../../infra/repositories/api-usage.repository.js';

const apiUsageRepository = new ApiUsageRepository();

/**
 * Middleware to track API usage statistics
 * Records endpoint access, response times, status codes, and other metrics
 */
export const trackApiUsage = (req, res, next) => {
  // Record the start time
  const startTime = Date.now();

  // Store original res.json to intercept response
  const originalJson = res.json.bind(res);

  // Override res.json to capture response
  res.json = function (body) {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Capture usage data
    const usageData = {
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(startTime),
      userId: req.user?.id || null,
      userAgent: req.get('user-agent') || null,
      ipAddress:
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        null,
      queryParams: Object.keys(req.query).length > 0 ? req.query : null,
      errorMessage:
        res.statusCode >= 400 && body?.message ? body.message : null,
    };

    apiUsageRepository
      .create(usageData)
      .then(() => {
        logger.debug(
          `API Usage tracked: ${req.method} ${usageData.endpoint} - ${res.statusCode} (${responseTime}ms)`,
        );
      })
      .catch((error) => {
        logger.error(`Failed to track API usage: ${error.message}`);
      });

    return originalJson(body);
  };

  next();
};

/**
 * Middleware to exclude specific routes from tracking
 * @param {Array<string>} excludedPaths - Array of paths to exclude from tracking
 * @returns {Function} Middleware function
 */
export const excludeFromTracking = (excludedPaths = []) => {
  return (req, res, next) => {
    const path = req.route?.path || req.path;

    // Check if current path should be excluded
    const shouldExclude = excludedPaths.some((excludedPath) => {
      if (excludedPath instanceof RegExp) {
        return excludedPath.test(path);
      }
      return path === excludedPath || path.startsWith(excludedPath);
    });

    if (shouldExclude) {
      // Skip tracking for this route
      return next();
    }

    // Apply tracking middleware
    return trackApiUsage(req, res, next);
  };
};
