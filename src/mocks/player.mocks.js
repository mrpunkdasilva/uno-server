/**
 * Mock objects for PlayerService tests
 * Provides reusable mock data and utilities for testing player-related functionality
 */

export const mockPlayerDoc = {
  _id: { toString: () => '507f1f77bcf86cd799439011' },
  email: 'player1@example.com',
  username: 'player1',
  password: '$2b$10$hashedPasswordExample123456789012345678',
  createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
  toObject: jest.fn().mockReturnValue({
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    email: 'player1@example.com',
    username: 'player1',
    password: '$2b$10$hashedPasswordExample123456789012345678',
    createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
  }),
};

export const mockPlayerDoc2 = {
  _id: { toString: () => '507f1f77bcf86cd799439012' },
  email: 'player2@example.com',
  username: 'player2',
  password: '$2b$10$hashedPasswordExample123456789012345679',
  createdAt: new Date('2024-01-02T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-02T10:00:00Z').toISOString(),
  toObject: jest.fn().mockReturnValue({
    _id: { toString: () => '507f1f77bcf86cd799439012' },
    email: 'player2@example.com',
    username: 'player2',
    password: '$2b$10$hashedPasswordExample123456789012345679',
    createdAt: new Date('2024-01-02T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-02T10:00:00Z').toISOString(),
  }),
};

export const mockPlayerDoc3 = {
  _id: { toString: () => '507f1f77bcf86cd799439013' },
  email: 'player3@example.com',
  username: 'player3',
  password: '$2b$10$hashedPasswordExample123456789012345680',
  createdAt: new Date('2024-01-03T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-03T10:00:00Z').toISOString(),
  toObject: jest.fn().mockReturnValue({
    _id: { toString: () => '507f1f77bcf86cd799439013' },
    email: 'player3@example.com',
    username: 'player3',
    password: '$2b$10$hashedPasswordExample123456789012345680',
    createdAt: new Date('2024-01-03T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-03T10:00:00Z').toISOString(),
  }),
};

export const mockParsedPlayer = {
  id: '507f1f77bcf86cd799439011',
  email: 'player1@example.com',
  username: 'player1',
  createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
};

export const mockParsedPlayer2 = {
  id: '507f1f77bcf86cd799439012',
  email: 'player2@example.com',
  username: 'player2',
  createdAt: new Date('2024-01-02T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-02T10:00:00Z').toISOString(),
};

export const mockCreatePlayerData = {
  email: 'newplayer@example.com',
  username: 'newplayer',
  password: 'SecurePassword123!',
};

export const mockCreatedPlayerDoc = {
  _id: { toString: () => '507f1f77bcf86cd799439014' },
  email: 'newplayer@example.com',
  username: 'newplayer',
  password: '$2b$10$hashedPasswordExample123456789012345681',
  createdAt: new Date('2024-01-04T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-04T10:00:00Z').toISOString(),
  toObject: jest.fn().mockReturnValue({
    _id: { toString: () => '507f1f77bcf86cd799439014' },
    email: 'newplayer@example.com',
    username: 'newplayer',
    password: '$2b$10$hashedPasswordExample123456789012345681',
    createdAt: new Date('2024-01-04T10:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-04T10:00:00Z').toISOString(),
  }),
};

export const mockCreatedParsedPlayer = {
  id: '507f1f77bcf86cd799439014',
  email: 'newplayer@example.com',
  username: 'newplayer',
  createdAt: new Date('2024-01-04T10:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-04T10:00:00Z').toISOString(),
};

export const mockUpdatePlayerData = {
  email: 'updated@example.com',
  username: 'updatedusername',
};

export const mockUpdatePasswordData = {
  password: 'NewSecurePassword456!',
};

export const mockInvalidPlayerData = {
  email: 'invalid-email',
  username: '', // Empty username
};

// Repository mocks
export const mockPlayerRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Logger mocks
export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Schema mocks
export const mockSchemas = {
  playerResponseDtoSchema: {
    parse: jest.fn(),
  },
};

/**
 * Function to reset all mocks to their initial state
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();

  // Reset repository mocks
  Object.values(mockPlayerRepository).forEach((mock) => {
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

  // Reset schema mocks
  Object.values(mockSchemas).forEach((schema) => {
    if (schema.parse && typeof schema.parse.mockClear === 'function') {
      schema.parse.mockClear();
    }
  });
};

/**
 * Function to setup default mock implementations
 */
export const setupDefaultMocks = () => {
  // Configure default return values for schemas
  mockSchemas.playerResponseDtoSchema.parse.mockImplementation((data) => ({
    id: data.id || data._id?.toString?.(),
    email: data.email,
    username: data.username,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }));

  return {
    playerRepository: mockPlayerRepository,
    logger: mockLogger,
    schemas: mockSchemas,
  };
};
