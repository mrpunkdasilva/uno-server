import LRUCache from '../../infra/cache/lru-cache.js';
import logger from '../../config/logger.js';

/**
 * Memoization Middleware with LRU Cache
 *
 * This middleware intercepts HTTP requests and stores responses in cache
 * to improve performance on repeated requests.
 * - LRU (Least Recently Used) Cache
 * - Configurable expiration time (maxAge)
 * - Configurable maximum size (max)
 * - Automatic TTL renewal on subsequent accesses
 * - Cache key based on HTTP method, URL and query params
 */

/**
 * Creates a memoization middleware instance
 * @param {Object} config - Cache configuration
 * @param {number} [config.max=100] - Maximum number of items in the cache
 * @param {number} [config.maxAge=60000] - Time to live of items in ms
 * @param {string[]} [config.methods=['GET']] - HTTP methods to be cached
 * @param {string[]} [config.excludePaths=[]] - Paths to be excluded from cache
 * @param {boolean} [config.includeHeaders=false] - Include headers in cache key
 * @param {boolean} [config.enabled=true] - Enable/disable cache
 * @returns {Function} - Express middleware
 */
export function createMemoizationMiddleware(config = {}) {
  const defaultConfig = {
    max: 100,
    maxAge: 60000, // 60 seconds
    methods: ['GET'],
    excludePaths: [],
    includeHeaders: false,
    enabled: true,
  };

  const options = { ...defaultConfig, ...config };

  // Create LRU cache instance
  const cache = new LRUCache({
    max: options.max,
    maxAge: options.maxAge,
  });

  // Interval to periodically clean expired items
  let cleanupInterval = null;
  if (options.enabled) {
    cleanupInterval = setInterval(() => {
      const removed = cache.purgeExpired();
      if (removed > 0) {
        logger.info({ removed }, 'Cache: Removed expired items');
      }
    }, Math.min(options.maxAge, 60000)); // Clean every maxAge or at most every 60s
  }

  /**
   * Checks if the path should be excluded from cache
   * @param {string} path - Request path
   * @returns {boolean} - true if should be excluded
   */
  function shouldExclude(path) {
    return options.excludePaths.some((excludePath) => {
      if (excludePath.includes('*')) {
        const regex = new RegExp('^' + excludePath.replace(/\*/g, '.*') + '$');
        return regex.test(path);
      }
      return path.startsWith(excludePath);
    });
  }

  /**
   * Express middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @returns {void}
   */
  const middleware = (req, res, next) => {
    // If cache disabled, skip
    if (!options.enabled) {
      return next();
    }

    // Check if HTTP method should be cached
    if (!options.methods.includes(req.method)) {
      return next();
    }

    // Check if path is in exclusion list
    if (shouldExclude(req.path)) {
      return next();
    }

    // Generate cache key
    const headers = options.includeHeaders ? req.headers : {};
    const cacheKey = cache.generateKey(
      req.method,
      req.path,
      req.query,
      headers,
    );

    // Try to get from cache
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      // Cache HIT - return cached response
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);

      return res.status(cachedResponse.statusCode).json(cachedResponse.body);
    }

    // Cache MISS - intercept response to cache
    res.set('X-Cache', 'MISS');
    res.set('X-Cache-Key', cacheKey);

    // Save original references
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Intercept res.json()
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          statusCode: res.statusCode,
          body: body,
        });
      }

      return originalJson(body);
    };

    // Intercept res.send()
    res.send = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Try to parse JSON if possible
        let parsedBody = body;
        if (typeof body === 'string') {
          try {
            parsedBody = JSON.parse(body);
          } catch (e) {
            // Not JSON, keep as string
          }
        }

        cache.set(cacheKey, {
          statusCode: res.statusCode,
          body: parsedBody,
        });
      }

      return originalSend(body);
    };

    next();
  };

  // Add utility methods to middleware
  middleware.cache = cache;
  middleware.clear = () => cache.clear();
  middleware.getStats = () => cache.getStats();
  middleware.destroy = () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    cache.clear();
  };

  return middleware;
}

/**
 * Middleware with default configuration
 * Export for direct usage
 * @param {Object} config - Middleware configuration
 * @returns {Function} Memoization middleware
 */
export default function memoizationMiddleware(config = {}) {
  return createMemoizationMiddleware(config);
}
