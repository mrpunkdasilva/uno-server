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
}

export default ApiUsageRepository;
