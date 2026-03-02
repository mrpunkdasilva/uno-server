import express from 'express';
import ApiUsageRepository from '../../infra/repositories/api-usage.repository.js';
import ApiUsageService from '../../core/services/api-usage.service.js';
import ApiUsageController from '../controllers/api-usage.controller.js';
import { authenticateToken } from '../middlewares/authentication.middleware.js';

const router = express.Router();

const apiUsageRepository = new ApiUsageRepository();
const apiUsageService = new ApiUsageService(apiUsageRepository);
const apiUsageController = new ApiUsageController(apiUsageService);

router.get(
  '/requests',
  authenticateToken,
  apiUsageController.getRequestStats.bind(apiUsageController),
);

router.get(
  '/response-times',
  authenticateToken,
  apiUsageController.getResponseTimeStats.bind(apiUsageController),
);

router.get(
  '/status-codes',
  authenticateToken,
  apiUsageController.getStatusCodeStats.bind(apiUsageController),
);

router.get(
  '/popular-endpoints',
  authenticateToken,
  apiUsageController.getPopularEndpoints.bind(apiUsageController),
);

router.get(
  '/dashboard',
  authenticateToken,
  apiUsageController.getDashboard.bind(apiUsageController),
);

export default router;
