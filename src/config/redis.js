import 'dotenv/config';
import { createClient } from 'redis';
import logger from './logger.js';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = process.env.REDIS_DB;

const isTestEnvironment = process.env.NODE_ENV === 'test';

const redisClient = createClient({
  url: REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`,
  password: REDIS_PASSWORD,
  database: REDIS_DB,
  socket: {
    reconnectStrategy: isTestEnvironment
      ? false // Disable reconnection in test environment
      : (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection limit reached');
            return new Error('Redis reconnection limit reached');
          }
          return Math.min(retries * 100, 3000);
        },
  },
});

redisClient.on('error', (err) => {
  if (!isTestEnvironment) {
    logger.error({ err }, 'Redis Client Error');
  }
});

redisClient.on('connect', () => {
  if (!isTestEnvironment) {
    logger.info('Connected to Redis');
  }
});

redisClient.on('ready', () => {
  if (!isTestEnvironment) {
    logger.info('Redis client ready');
  }
});

redisClient.on('reconnecting', () => {
  if (!isTestEnvironment) {
    logger.info('Reconnecting to Redis...');
  }
});

redisClient.on('end', () => {
  if (!isTestEnvironment) {
    logger.info('Redis connection closed');
  }
});

export default redisClient;
