/**
 * Mock objects for AuthService tests
 * Provides reusable mock data and utilities for testing authentication functionality
 */

export const mockPlayerId = '507f1f77bcf86cd799439011';
export const mockEmail = 'player@example.com';
export const mockPassword = 'SecurePassword123!';
export const mockHashedPassword =
  '$2b$10$hashedPasswordExample123456789012345678';

export const mockPlayer = {
  _id: mockPlayerId,
  email: mockEmail,
  password: mockHashedPassword,
  username: 'testplayer',
  createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
};

export const mockAccessToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImlhdCI6MTcwNDExMzIwMCwiZXhwIjoxNzA0MTE0MDAwfQ.mockAccessTokenSignature';

export const mockRefreshToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImlhdCI6MTcwNDExMzIwMCwiZXhwIjoxNzA0NzE4MDAwfQ.mockRefreshTokenSignature';

export const mockDecodedToken = {
  id: mockPlayerId,
  iat: 1704113200,
  exp: 1704114000,
};

export const mockDecodedRefreshToken = {
  id: mockPlayerId,
  iat: 1704113200,
  exp: 1704718000,
};

export const mockInvalidToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';

export const mockExpiredToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImlhdCI6MTcwNDExMzIwMCwiZXhwIjoxNzA0MTEzMTAwfQ.expiredTokenSignature';

// Repository mocks
export const mockPlayerRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

// Redis mocks
export const mockRedisClient = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

// Logger mocks
export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

/**
 * Function to reset all mocks to their initial state
 * @returns {void}
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();

  // Reset repository mocks
  Object.values(mockPlayerRepository).forEach((mock) => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });

  // Reset redis mocks
  Object.values(mockRedisClient).forEach((mock) => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });

  // Reset logger mocks
  Object.values(mockLogger).forEach((mock) => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
};

/**
 * Function to setup default mock implementations
 */
export const setupDefaultMocks = () => {
  // Configure default return values
  mockRedisClient.set.mockResolvedValue('OK');
  mockRedisClient.get.mockResolvedValue(null);
  mockRedisClient.del.mockResolvedValue(1);

  return {
    playerRepository: mockPlayerRepository,
    redisClient: mockRedisClient,
    logger: mockLogger,
  };
};
