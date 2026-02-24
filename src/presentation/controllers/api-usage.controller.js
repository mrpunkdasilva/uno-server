import logger from '../../config/logger.js';
import ApiUsageRepository from '../../infra/repositories/api-usage.repository.js';

/**
 * Controller for API usage statistics endpoints
 * Handles requests for various API usage metrics and statistics
 */
class ApiUsageController {
  /**
   * Creates a new instance of ApiUsageController
   */
  constructor(apiUsageService) {
    this.apiUsageService = apiUsageService;
  }

  /**
   * GET /stats/requests
   * Returns the total number of requests made to the API, broken down by endpoint and method
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRequestStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const options = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const stats = await this.apiUsageService.getRequestStats(options);

      logger.info(
        `Request stats retrieved successfully (filters: ${JSON.stringify(
          options,
        )})`,
      );

      res.status(200).json({
        success: true,
        message: 'Request statistics retrieved successfully',
        ...stats,
      });
    } catch (error) {
      logger.error(`Failed to get request stats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve request statistics',
      });
    }
  }

  /**
   * GET /stats/response-times
   * Returns average, minimum, and maximum response times for each endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getResponseTimeStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const options = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const stats = await this.apiUsageService.getResponseTimeStats(options);

      logger.info(
        `Response time stats retrieved successfully (filters: ${JSON.stringify(
          options,
        )})`,
      );

      res.status(200).json({
        success: true,
        message: 'Response time statistics retrieved successfully',
        ...stats,
      });
    } catch (error) {
      logger.error(`Failed to get response time stats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve response time statistics',
      });
    }
  }

  /**
   * GET /stats/status-codes
   * Provides a summary of status codes returned by the API
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStatusCodeStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const options = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const stats = await this.apiUsageService.getStatusCodeStats(options);

      logger.info(
        `Status code stats retrieved successfully (filters: ${JSON.stringify(
          options,
        )})`,
      );

      res.status(200).json({
        success: true,
        message: 'Status code statistics retrieved successfully',
        ...stats,
      });
    } catch (error) {
      logger.error(`Failed to get status code stats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve status code statistics',
      });
    }
  }

  /**
   * GET /stats/popular-endpoints
   * Lists the most frequently accessed endpoints with request counts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPopularEndpoints(req, res) {
    try {
      const { startDate, endDate, limit } = req.query;

      const options = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;
      if (limit) options.limit = parseInt(limit, 10);

      const stats = await this.apiUsageService.getPopularEndpoints(options);

      logger.info(
        `Popular endpoints retrieved successfully (filters: ${JSON.stringify(
          options,
        )})`,
      );

      res.status(200).json({
        success: true,
        message: 'Popular endpoints retrieved successfully',
        ...stats,
      });
    } catch (error) {
      logger.error(`Failed to get popular endpoints: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve popular endpoints',
      });
    }
  }

  /**
   * GET /stats/dashboard
   * Returns comprehensive dashboard statistics including all metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboard(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const options = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const stats = await this.apiUsageService.getDashboardStats(options);

      logger.info(
        `Dashboard stats retrieved successfully (filters: ${JSON.stringify(
          options,
        )})`,
      );

      res.status(200).json({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        ...stats,
      });
    } catch (error) {
      logger.error(`Failed to get dashboard stats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve dashboard statistics',
      });
    }
  }

  /**
   * GET /stats/health
   * Returns basic health information about the API tracking system
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrackingHealth(req, res) {
    try {
      const apiUsageRepository = new ApiUsageRepository();

      // Get total count of records
      const totalRecords = await apiUsageRepository.count();

      // Get count from last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await apiUsageRepository.count({ startDate: last24Hours });

      // Get count from last 7 days
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const lastWeek = await apiUsageRepository.count({ startDate: last7Days });

      res.status(200).json({
        success: true,
        message: 'API tracking system is operational',
        data: {
          totalRecords,
          last24Hours: recent,
          last7Days: lastWeek,
          trackingActive: true,
        },
      });
    } catch (error) {
      logger.error(`Failed to get tracking health: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tracking health information',
      });
    }
  }
}

export default ApiUsageController;
