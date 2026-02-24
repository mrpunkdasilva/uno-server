import ApiUsage from '../models/api-usage.model.js';

/**
 * Repository class for managing API usage tracking data operations.
 * Provides methods for recording API calls and retrieving usage statistics.
 */
class ApiUsageRepository {
  /**
   * Creates a new API usage record
   * @param {Object} usageData - The API usage data to record
   * @param {string} usageData.endpoint - The endpoint accessed
   * @param {string} usageData.method - The HTTP method used
   * @param {number} usageData.statusCode - The response status code
   * @param {number} usageData.responseTime - The response time in milliseconds
   * @param {Date} [usageData.timestamp] - The timestamp of the request
   * @param {string} [usageData.userId] - The ID of the authenticated user
   * @param {string} [usageData.userAgent] - The user agent string
   * @param {string} [usageData.ipAddress] - The client IP address
   * @param {Object} [usageData.queryParams] - The query parameters
   * @param {string} [usageData.errorMessage] - Error message if applicable
   * @returns {Promise<Object>} The created API usage record
   */
  async create(usageData) {
    const usage = new ApiUsage(usageData);
    return await usage.save();
  }

  /**
   * Retrieves the total number of requests grouped by endpoint and method
   * @param {Object} filters - Optional filters
   * @param {Date} [filters.startDate] - Start date for filtering
   * @param {Date} [filters.endDate] - End date for filtering
   * @returns {Promise<Array>} Array of aggregated request counts
   */
  async getTotalRequestsByEndpoint(filters = {}) {
    const matchStage = this._buildMatchStage(filters);

    return await ApiUsage.aggregate([
      ...(matchStage ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $project: {
          _id: 0,
          endpoint: '$_id.endpoint',
          method: '$_id.method',
          count: 1,
        },
      },
    ]);
  }

  /**
   * Retrieves response time statistics (avg, min, max) for each endpoint
   * @param {Object} filters - Optional filters
   * @param {Date} [filters.startDate] - Start date for filtering
   * @param {Date} [filters.endDate] - End date for filtering
   * @returns {Promise<Array>} Array of response time statistics
   */
  async getResponseTimeStats(filters = {}) {
    const matchStage = this._buildMatchStage(filters);

    return await ApiUsage.aggregate([
      ...(matchStage ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method',
          },
          avgResponseTime: { $avg: '$responseTime' },
          minResponseTime: { $min: '$responseTime' },
          maxResponseTime: { $max: '$responseTime' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { avgResponseTime: -1 },
      },
      {
        $project: {
          _id: 0,
          endpoint: '$_id.endpoint',
          method: '$_id.method',
          avgResponseTime: { $round: ['$avgResponseTime', 2] },
          minResponseTime: 1,
          maxResponseTime: 1,
          requestCount: '$count',
        },
      },
    ]);
  }

  /**
   * Retrieves status code distribution
   * @param {Object} filters - Optional filters
   * @param {Date} [filters.startDate] - Start date for filtering
   * @param {Date} [filters.endDate] - End date for filtering
   * @returns {Promise<Array>} Array of status code counts
   */
  async getStatusCodeStats(filters = {}) {
    const matchStage = this._buildMatchStage(filters);

    return await ApiUsage.aggregate([
      ...(matchStage ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$statusCode',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          statusCode: '$_id',
          count: 1,
        },
      },
    ]);
  }

  /**
   * Retrieves the most popular endpoints
   * @param {Object} filters - Optional filters
   * @param {Date} [filters.startDate] - Start date for filtering
   * @param {Date} [filters.endDate] - End date for filtering
   * @param {number} [filters.limit=10] - Maximum number of results
   * @returns {Promise<Array>} Array of popular endpoints with request counts
   */
  async getPopularEndpoints(filters = {}) {
    const matchStage = this._buildMatchStage(filters);
    const limit = filters.limit || 10;

    return await ApiUsage.aggregate([
      ...(matchStage ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: {
            endpoint: '$endpoint',
            method: '$method',
          },
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 0,
          endpoint: '$_id.endpoint',
          method: '$_id.method',
          requestCount: '$count',
          avgResponseTime: { $round: ['$avgResponseTime', 2] },
        },
      },
    ]);
  }

  /**
   * Retrieves all records within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of API usage records
   */
  async findByDateRange(startDate, endDate) {
    return await ApiUsage.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ timestamp: -1 });
  }

  /**
   * Retrieves records for a specific endpoint
   * @param {string} endpoint - The endpoint path
   * @param {number} [limit=100] - Maximum number of results
   * @returns {Promise<Array>} Array of API usage records
   */
  async findByEndpoint(endpoint, limit = 100) {
    return await ApiUsage.find({ endpoint })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Retrieves records for a specific user
   * @param {string} userId - The user ID
   * @param {number} [limit=100] - Maximum number of results
   * @returns {Promise<Array>} Array of API usage records
   */
  async findByUserId(userId, limit = 100) {
    return await ApiUsage.find({ userId }).sort({ timestamp: -1 }).limit(limit);
  }

  /**
   * Deletes records older than a specific date
   * @param {Date} date - The cutoff date
   * @returns {Promise<Object>} Result of the delete operation
   */
  async deleteOlderThan(date) {
    return await ApiUsage.deleteMany({
      timestamp: { $lt: date },
    });
  }

  /**
   * Gets the total count of all API usage records
   * @param {Object} filters - Optional filters
   * @returns {Promise<number>} Total count of records
   */
  async count(filters = {}) {
    const matchStage = this._buildMatchStage(filters);
    if (matchStage) {
      return await ApiUsage.countDocuments(matchStage);
    }
    return await ApiUsage.countDocuments();
  }

  /**
   * Builds a MongoDB match stage based on filters
   * @private
   * @param {Object} filters - Filter criteria
   * @returns {Object|null} MongoDB match object or null
   */
  _buildMatchStage(filters) {
    const match = {};

    if (filters.startDate || filters.endDate) {
      match.timestamp = {};
      if (filters.startDate) {
        match.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        match.timestamp.$lte = filters.endDate;
      }
    }

    if (filters.endpoint) {
      match.endpoint = filters.endpoint;
    }

    if (filters.method) {
      match.method = filters.method;
    }

    if (filters.statusCode) {
      match.statusCode = filters.statusCode;
    }

    if (filters.userId) {
      match.userId = filters.userId;
    }

    return Object.keys(match).length > 0 ? match : null;
  }
}

export default ApiUsageRepository;
