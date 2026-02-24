import logger from '../../config/logger.js';

/**
 * Service class for processing and retrieving API usage statistics.
 * Provides business logic for analyzing API usage patterns.
 */
class ApiUsageService {
  /**
   * Creates a new instance of ApiUsageService
   * @param {ApiUsageRepository} apiUsageRepository - Repository for API usage data
   */
  constructor(apiUsageRepository) {
    this.apiUsageRepository = apiUsageRepository;
  }

  /**
   * Records a new API usage entry
   * @param {Object} usageData - The API usage data
   * @returns {Promise<Object>} The created usage record
   */
  async recordUsage(usageData) {
    try {
      return await this.apiUsageRepository.create(usageData);
    } catch (error) {
      logger.error(`Failed to record API usage: ${error.message}`);
      // Don't throw - we don't want tracking to break the API
      return null;
    }
  }

  /**
   * Retrieves total requests grouped by endpoint and method
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date for filtering
   * @param {Date} [options.endDate] - End date for filtering
   * @returns {Promise<Object>} Statistics object with request counts
   */
  async getRequestStats(options = {}) {
    try {
      const filters = this._buildFilters(options);
      const data = await this.apiUsageRepository.getTotalRequestsByEndpoint(
        filters,
      );

      // Group by endpoint for better organization
      const groupedByEndpoint = this._groupByEndpoint(data);

      // Calculate totals
      const totalRequests = data.reduce((sum, item) => sum + item.count, 0);

      return {
        success: true,
        data: {
          totalRequests,
          endpoints: groupedByEndpoint,
          detailedBreakdown: data,
        },
        filters: this._formatFilters(filters),
      };
    } catch (error) {
      logger.error(`Failed to get request stats: ${error.message}`);
      throw new Error('Failed to retrieve request statistics');
    }
  }

  /**
   * Retrieves response time statistics for endpoints
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date for filtering
   * @param {Date} [options.endDate] - End date for filtering
   * @returns {Promise<Object>} Response time statistics
   */
  async getResponseTimeStats(options = {}) {
    try {
      const filters = this._buildFilters(options);
      const data = await this.apiUsageRepository.getResponseTimeStats(filters);

      // Calculate overall statistics
      const overallStats = this._calculateOverallResponseStats(data);

      // Find slowest endpoints
      const slowestEndpoints = [...data]
        .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
        .slice(0, 5);

      // Find fastest endpoints
      const fastestEndpoints = [...data]
        .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
        .slice(0, 5);

      return {
        success: true,
        data: {
          overall: overallStats,
          slowestEndpoints,
          fastestEndpoints,
          allEndpoints: data,
        },
        filters: this._formatFilters(filters),
      };
    } catch (error) {
      logger.error(`Failed to get response time stats: ${error.message}`);
      throw new Error('Failed to retrieve response time statistics');
    }
  }

  /**
   * Retrieves status code distribution
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date for filtering
   * @param {Date} [options.endDate] - End date for filtering
   * @returns {Promise<Object>} Status code statistics
   */
  async getStatusCodeStats(options = {}) {
    try {
      const filters = this._buildFilters(options);
      const data = await this.apiUsageRepository.getStatusCodeStats(filters);

      // Categorize status codes
      const categorized = this._categorizeStatusCodes(data);

      // Calculate totals
      const totalRequests = data.reduce((sum, item) => sum + item.count, 0);

      // Calculate percentages
      const withPercentages = data.map((item) => ({
        ...item,
        percentage: ((item.count / totalRequests) * 100).toFixed(2),
      }));

      return {
        success: true,
        data: {
          totalRequests,
          byCategory: categorized,
          byStatusCode: withPercentages,
          summary: this._generateStatusSummary(categorized, totalRequests),
        },
        filters: this._formatFilters(filters),
      };
    } catch (error) {
      logger.error(`Failed to get status code stats: ${error.message}`);
      throw new Error('Failed to retrieve status code statistics');
    }
  }

  /**
   * Retrieves the most popular endpoints
   * @param {Object} options - Query options
   * @param {Date} [options.startDate] - Start date for filtering
   * @param {Date} [options.endDate] - End date for filtering
   * @param {number} [options.limit=10] - Maximum number of results
   * @returns {Promise<Object>} Popular endpoints statistics
   */
  async getPopularEndpoints(options = {}) {
    try {
      const filters = this._buildFilters(options);
      const data = await this.apiUsageRepository.getPopularEndpoints(filters);

      // Calculate total requests from popular endpoints
      const totalRequests = data.reduce(
        (sum, item) => sum + item.requestCount,
        0,
      );

      // Add percentage and rank
      const withMetadata = data.map((item, index) => ({
        rank: index + 1,
        ...item,
        percentage:
          totalRequests > 0
            ? ((item.requestCount / totalRequests) * 100).toFixed(2)
            : '0.00',
      }));

      return {
        success: true,
        data: {
          totalRequests,
          topEndpoints: withMetadata,
          limit: filters.limit || 10,
        },
        filters: this._formatFilters(filters),
      };
    } catch (error) {
      logger.error(`Failed to get popular endpoints: ${error.message}`);
      throw new Error('Failed to retrieve popular endpoints');
    }
  }

  /**
   * Gets comprehensive dashboard statistics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Complete dashboard data
   */
  async getDashboardStats(options = {}) {
    try {
      const filters = this._buildFilters(options);

      const [requests, responseTimes, statusCodes, popular] = await Promise.all(
        [
          this.getRequestStats(options),
          this.getResponseTimeStats(options),
          this.getStatusCodeStats(options),
          this.getPopularEndpoints({ ...options, limit: 5 }),
        ],
      );

      return {
        success: true,
        data: {
          requests: requests.data,
          responseTimes: responseTimes.data,
          statusCodes: statusCodes.data,
          popularEndpoints: popular.data,
        },
        filters: this._formatFilters(filters),
      };
    } catch (error) {
      logger.error(`Failed to get dashboard stats: ${error.message}`);
      throw new Error('Failed to retrieve dashboard statistics');
    }
  }

  /**
   * Builds filter object from options
   * @private
   * @param {Object} options - Query options
   * @returns {Object} Filter object
   */
  _buildFilters(options) {
    const filters = {};

    if (options.startDate) {
      filters.startDate = new Date(options.startDate);
    }

    if (options.endDate) {
      filters.endDate = new Date(options.endDate);
    }

    if (options.endpoint) {
      filters.endpoint = options.endpoint;
    }

    if (options.method) {
      filters.method = options.method.toUpperCase();
    }

    if (options.statusCode) {
      filters.statusCode = parseInt(options.statusCode, 10);
    }

    if (options.userId) {
      filters.userId = options.userId;
    }

    if (options.limit) {
      filters.limit = parseInt(options.limit, 10);
    }

    return filters;
  }

  /**
   * Formats filters for response
   * @private
   * @param {Object} filters - Filter object
   * @returns {Object} Formatted filters
   */
  _formatFilters(filters) {
    const formatted = { ...filters };

    if (formatted.startDate) {
      formatted.startDate = formatted.startDate.toISOString();
    }

    if (formatted.endDate) {
      formatted.endDate = formatted.endDate.toISOString();
    }

    return formatted;
  }

  /**
   * Groups request data by endpoint
   * @private
   * @param {Array} data - Request data
   * @returns {Object} Grouped data
   */
  _groupByEndpoint(data) {
    const grouped = {};

    data.forEach((item) => {
      if (!grouped[item.endpoint]) {
        grouped[item.endpoint] = {
          endpoint: item.endpoint,
          totalRequests: 0,
          methods: {},
        };
      }

      grouped[item.endpoint].totalRequests += item.count;
      grouped[item.endpoint].methods[item.method] = item.count;
    });

    return Object.values(grouped).sort(
      (a, b) => b.totalRequests - a.totalRequests,
    );
  }

  /**
   * Calculates overall response time statistics
   * @private
   * @param {Array} data - Response time data
   * @returns {Object} Overall statistics
   */
  _calculateOverallResponseStats(data) {
    if (data.length === 0) {
      return {
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        totalEndpoints: 0,
      };
    }

    const totalRequests = data.reduce(
      (sum, item) => sum + item.requestCount,
      0,
    );
    const weightedSum = data.reduce(
      (sum, item) => sum + item.avgResponseTime * item.requestCount,
      0,
    );

    return {
      avgResponseTime: parseFloat((weightedSum / totalRequests).toFixed(2)),
      minResponseTime: Math.min(...data.map((d) => d.minResponseTime)),
      maxResponseTime: Math.max(...data.map((d) => d.maxResponseTime)),
      totalEndpoints: data.length,
    };
  }

  /**
   * Categorizes status codes by type
   * @private
   * @param {Array} data - Status code data
   * @returns {Object} Categorized status codes
   */
  _categorizeStatusCodes(data) {
    const categories = {
      success: { range: '2xx', codes: [], total: 0 },
      redirection: { range: '3xx', codes: [], total: 0 },
      clientError: { range: '4xx', codes: [], total: 0 },
      serverError: { range: '5xx', codes: [], total: 0 },
      other: { range: 'Other', codes: [], total: 0 },
    };

    data.forEach((item) => {
      const code = item.statusCode;

      if (code >= 200 && code < 300) {
        categories.success.codes.push(item);
        categories.success.total += item.count;
      } else if (code >= 300 && code < 400) {
        categories.redirection.codes.push(item);
        categories.redirection.total += item.count;
      } else if (code >= 400 && code < 500) {
        categories.clientError.codes.push(item);
        categories.clientError.total += item.count;
      } else if (code >= 500 && code < 600) {
        categories.serverError.codes.push(item);
        categories.serverError.total += item.count;
      } else {
        categories.other.codes.push(item);
        categories.other.total += item.count;
      }
    });

    return categories;
  }

  /**
   * Generates a summary of status codes
   * @private
   * @param {Object} categorized - Categorized status codes
   * @param {number} totalRequests - Total number of requests
   * @returns {Object} Status summary
   */
  _generateStatusSummary(categorized, totalRequests) {
    const summary = {};

    Object.keys(categorized).forEach((key) => {
      summary[key] = {
        total: categorized[key].total,
        percentage:
          totalRequests > 0
            ? ((categorized[key].total / totalRequests) * 100).toFixed(2)
            : '0.00',
      };
    });

    return summary;
  }
}

export default ApiUsageService;
