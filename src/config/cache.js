/**
 * Memoization Middleware Configuration
 *
 * This file contains configuration examples for the LRU cache middleware.
 * You can export different configurations depending on the environment or route.
 */

/**
 * Default configuration for general cache
 * - max: Maximum number of items in cache
 * - maxAge: Maximum lifetime of an item in cache
 * - methods: HTTP methods that should be cached
 * - excludePaths: Paths that should not be cached
 * - includeHeaders: Include headers in cache key
 * - enabled: Cache enabled
 */
export const defaultCacheConfig = {
  max: 100,
  maxAge: 60000, // 60 seconds
  methods: ['GET'],
  excludePaths: [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/refresh-token',
  ],
  includeHeaders: true,
  includeUserId: true, // Include user ID to prevent caching across different users
  enabled: true,
};

/**
 * Configuration for short-term cache
 * Ideal for frequently changing data
 */
export const shortTermCacheConfig = {
  max: 50,
  maxAge: 10000, // 10 seconds
  methods: ['GET'],
  excludePaths: [],
  includeHeaders: false,
  includeUserId: true, // Include user ID to prevent caching across different users
  enabled: true,
};

/**
 * Configuration for long-term cache
 * Ideal for static data or data that rarely changes
 */
export const longTermCacheConfig = {
  max: 500,
  maxAge: 300000, // 5 minutes
  methods: ['GET'],
  excludePaths: ['/api/auth/*'],
  includeHeaders: false,
  includeUserId: true, // Include user ID to prevent caching across different users
  enabled: true,
};

/**
 * Configuration for development
 * Cache disabled to facilitate testing
 */
export const devCacheConfig = {
  max: 10,
  maxAge: 5000, // 5 seconds
  methods: ['GET'],
  excludePaths: [],
  includeHeaders: false,
  includeUserId: true, // Include user ID to prevent caching across different users
  enabled: process.env.NODE_ENV !== 'development', // Disable in dev
};

/**
 * Configuration for production
 * Optimized for performance in production environment
 */
export const productionCacheConfig = {
  max: 500,
  maxAge: 120000, // 2 minutes
  methods: ['GET'],
  excludePaths: ['/api/auth/login', '/api/auth/logout', '/api/auth/refresh'],
  includeHeaders: false,
  includeUserId: true, // Include user ID to prevent caching across different users
  enabled: true,
};

/**
 * Configuration based on environment variables
 */
export const envBasedCacheConfig = {
  max: parseInt(process.env.CACHE_MAX_ITEMS) || 100,
  maxAge: parseInt(process.env.CACHE_MAX_AGE) || 60000,
  methods: process.env.CACHE_METHODS?.split(',') || ['GET'],
  excludePaths: process.env.CACHE_EXCLUDE_PATHS?.split(',') || [],
  includeHeaders: process.env.CACHE_INCLUDE_HEADERS === 'true',
  includeUserId: process.env.CACHE_INCLUDE_USER_ID !== 'false', // Include user ID by default
  enabled: process.env.CACHE_ENABLED !== 'false',
};

/**
 * Selects the appropriate configuration based on the environment
 * @returns {Object} Cache configuration for the current environment
 */
export function getCacheConfigForEnvironment() {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return productionCacheConfig;
    case 'test':
      return devCacheConfig;
    case 'development':
    default:
      return defaultCacheConfig;
  }
}

export default defaultCacheConfig;
