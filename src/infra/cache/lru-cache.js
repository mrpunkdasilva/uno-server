/**
 * LRU (Least Recently Used) Cache Implementation
 *
 * This class implements a cache with LRU policy, where the least
 * recently used items are removed when the cache reaches its maximum size.
 * - Configurable maximum size
 * - Expiration time per item (maxAge)
 * - Automatic timestamp renewal when accessing items
 * - Automatic removal of expired items
 * - LRU policy for removal when reaching maximum capacity
 */
class LRUCache {
  /**
   * LRUCache class constructor
   * @param {Object} options - Cache configuration options
   * @param {number} options.max - Maximum number of items in the cache
   * @param {number} options.maxAge - Time to live of items in milliseconds
   */
  constructor(options = {}) {
    this.max = options.max || 100;
    this.maxAge = options.maxAge || 60000; // 60 seconds by default
    this.cache = new Map();
  }

  /**
   * Generates a unique cache key based on request parameters
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} url - Full request URL
   * @param {Object} query - Query parameters
   * @param {Object} headers - Relevant headers (optional)
   * @param {string|null} userId - User ID to include in cache key (optional)
   * @returns {string} - Unique cache key
   */
  generateKey(method, url, query = {}, headers = {}, userId = null) {
    const queryString = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    const relevantHeaders = ['accept', 'content-type'];
    const headerString = relevantHeaders
      .filter((key) => headers[key])
      .map((key) => `${key}=${headers[key]}`)
      .join('&');

    const userIdString = userId ? `@${userId}` : '';

    return `${method}:${url}${queryString ? '?' + queryString : ''}${
      headerString ? '#' + headerString : ''
    }${userIdString}`;
  }

  /**
   * Checks if a cache item has expired
   * @param {Object} item - Cache item
   * @returns {boolean} - true if expired, false otherwise
   */
  isExpired(item) {
    return Date.now() > item.expiresAt;
  }

  /**
   * Retrieves an item from the cache
   * @param {string} key - Item key
   * @returns {*} - Stored value or undefined if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return undefined;
    }

    // Check if the item has expired
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access timestamp and expiration (renew TTL)
    item.accessedAt = Date.now();
    item.expiresAt = Date.now() + this.maxAge;

    // Move to the end (most recent) - delete and reinsert
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  /**
   * Stores an item in the cache
   * @param {string} key - Item key
   * @param {*} value - Value to be stored
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      expiresAt: Date.now() + this.maxAge,
    });
  }

  /**
   * Removes an item from the cache
   * @param {string} key - Key of the item to be removed
   * @returns {boolean} - true if removed, false if it didn't exist
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clears all expired items from the cache
   * @returns {number} - Number of items removed
   */
  purgeExpired() {
    let removed = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Completely clears the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Returns the current cache size
   * @returns {number} - Number of items in the cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Checks if a key exists in the cache and is not expired
   * @param {string} key - Key to be checked
   * @returns {boolean} - true if exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Returns cache statistics
   * @returns {Object} - Object with statistics
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      max: this.max,
      maxAge: this.maxAge,
      expiredCount,
      utilization: ((this.cache.size / this.max) * 100).toFixed(2) + '%',
    };
  }
}

export default LRUCache;
