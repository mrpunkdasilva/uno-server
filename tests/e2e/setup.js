import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { server } from '../../src/app.js';
import redisClient from '../../src/config/redis.js';
let mongoServer;
let serverInstance;

export const BASE_URL = 'http://localhost:3001';

/**
 * Setup test environment before all tests
 */
export const setupTestEnvironment = async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to in-memory database
  await mongoose.connect(mongoUri);

  // Connect to Redis with timeout (or mock if not available)
  const connectToRedis = async () => {
    return Promise.race([
      redisClient.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 3000),
      ),
    ]);
  };

  try {
    if (!redisClient.isOpen) {
      await connectToRedis();
      console.log('Connected to Redis for E2E tests');
    }
  } catch (error) {
    console.warn('Redis not available, using mock:', error.message);
    // Mock Redis methods to prevent errors
    redisClient.get = async () => null;
    redisClient.set = async () => 'OK';
    redisClient.del = async () => 1;
    redisClient.exists = async () => 0;
    redisClient.setEx = async () => 'OK';
    redisClient.quit = async () => 'OK';
    redisClient.disconnect = async () => {};
  }

  // Start Express server on a test port
  return new Promise((resolve) => {
    serverInstance = server.listen(3001, () => {
      console.log('Test server running on port 3001');
      resolve();
    });
  });
};

/**
 * Teardown test environment after all tests
 */
export const teardownTestEnvironment = async () => {
  // Close server
  if (serverInstance) {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server close timeout'));
      }, 5000);

      serverInstance.close((err) => {
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      });
    }).catch((err) => {
      console.warn('Error closing server:', err.message);
    });
  }

  // Disconnect from Redis
  try {
    if (redisClient.isOpen && typeof redisClient.quit === 'function') {
      await Promise.race([
        redisClient.quit(),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
  } catch (error) {
    console.warn('Error disconnecting from Redis:', error.message);
  }

  // Disconnect from database
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.warn('Error disconnecting from MongoDB:', error.message);
  }

  // Stop MongoDB Memory Server
  if (mongoServer) {
    try {
      await mongoServer.stop();
    } catch (error) {
      console.warn('Error stopping MongoDB Memory Server:', error.message);
    }
  }
};

/**
 * Clear all collections in the database
 */
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Helper function to make HTTP requests
 * @param method
 * @param endpoint
 * @param options
 */
export const makeRequest = async (method, endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const { body, headers = {}, token } = options;

  const requestOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (token) {
    requestOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestOptions);

  let data;
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    data,
    headers: response.headers,
  };
};

/**
 * Helper to create a test player
 * @param playerData
 */
export const createTestPlayer = async (playerData = {}) => {
  const defaultPlayer = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@test.com`,
    password: 'Test@123456',
  };

  const response = await makeRequest('POST', '/api/auth/register', {
    body: { ...defaultPlayer, ...playerData },
  });

  return response;
};

/**
 * Helper to login a player
 * @param email
 * @param password
 */
export const loginPlayer = async (email, password) => {
  const response = await makeRequest('POST', '/api/auth/login', {
    body: { email, password },
  });

  return response;
};

/**
 * Helper to create a test game
 * @param token
 * @param gameData
 */
export const createTestGame = async (token, gameData = {}) => {
  const defaultGame = {
    name: `Test Game ${Date.now()}`,
    rules: 'Standard UNO rules for testing',
    minPlayers: 2,
    maxPlayers: 4,
  };

  const response = await makeRequest('POST', '/api/games', {
    token,
    body: { ...defaultGame, ...gameData },
  });

  return response;
};

/**
 * Wait for a condition to be true
 * @param condition
 * @param timeout
 * @param interval
 */
export const waitFor = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
};

/**
 * Sleep utility
 * @param ms
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
