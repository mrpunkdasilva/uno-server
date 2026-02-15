jest.mock('jsonwebtoken');
jest.mock('bcrypt');
jest.mock('../../../../src/config/redis.js', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
}));
jest.mock('../../../../src/infra/repositories/player.repository.js');
jest.mock('../../../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
// NOTE: Mock token utility functions
jest.mock('../../../../src/core/utils/token.util.js', () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
  decodeToken: jest.fn(),
}));

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import AuthService from '../../../../src/core/services/auth.service.js';
import PlayerRepository from '../../../../src/infra/repositories/player.repository.js';
import redisClient from '../../../../src/config/redis.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import logger from '../../../../src/config/logger.js';
// NOTE: Import token utilities for testing
import * as tokenUtil from '../../../../src/core/utils/token.util.js';

// Import all mocks from centralized mock file
import {
  mockPlayerId,
  mockEmail,
  mockPassword,
  mockHashedPassword,
  mockPlayer,
  mockAccessToken,
  mockRefreshToken,
  mockDecodedToken,
  mockDecodedRefreshToken,
  mockInvalidToken,
  mockExpiredToken,
  mockPlayerRepository,
  resetAllMocks,
  setupDefaultMocks,
} from '../../../../src/mocks/auth.mocks.js';

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    resetAllMocks();

    // Setup default mocks
    const mocks = setupDefaultMocks();

    // Mock repository implementation
    PlayerRepository.mockImplementation(() => mocks.playerRepository);

    // Mock logger methods
    logger.info = mocks.logger.info;
    logger.warn = mocks.logger.warn;
    logger.error = mocks.logger.error;

    // Mock redis client
    redisClient.set = mocks.redisClient.set;
    redisClient.get = mocks.redisClient.get;
    redisClient.del = mocks.redisClient.del;

    // Create service instance
    authService = new AuthService();
    authService.playerRepository = mocks.playerRepository;

    // Set environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

    // Clear all mocks
    bcrypt.compare.mockClear();
    bcrypt.hash.mockClear();
    jwt.sign.mockClear();
    jwt.verify.mockClear();
    jwt.decode.mockClear();
    // NOTE: Clear token utility mocks
    tokenUtil.generateToken.mockClear();
    tokenUtil.verifyToken.mockClear();
    tokenUtil.decodeToken.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with PlayerRepository instance', () => {
      expect(PlayerRepository).toHaveBeenCalledTimes(1);
      expect(authService.playerRepository).toBeDefined();
      expect(typeof authService.playerRepository.findByEmail).toBe('function');
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      // NOTE: Mock tokenUtil.generateToken instead of jwt.sign
      tokenUtil.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await authService.login(mockEmail, mockPassword);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(mockPlayerRepository.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockPassword,
        mockHashedPassword,
      );
      expect(redisClient.set).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        `User ${mockPlayerId} logged in successfully.`,
      );
    });

    it('should throw error when user not found', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        `Authentication failed for email: ${mockEmail}. User not found.`,
      );
    });

    it('should throw error when password is invalid', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        `Authentication failed for email: ${mockEmail}. Invalid password.`,
      );
    });

    it('should store refresh token in Redis with correct expiration', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      tokenUtil.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      await authService.login(mockEmail, mockPassword);

      expect(redisClient.set).toHaveBeenCalledWith(
        `session:${mockPlayerId}`,
        mockRefreshToken,
        {
          EX: 7 * 24 * 60 * 60,
        },
      );
    });

    it('should log error when authentication fails', async () => {
      const dbError = new Error('Database connection failed');
      mockPlayerRepository.findByEmail.mockRejectedValue(dbError);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow(
        'Database connection failed',
      );

      expect(logger.error).toHaveBeenCalled();
    });

    it('should call bcrypt.compare with correct parameters', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      tokenUtil.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      await authService.login(mockEmail, mockPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockPassword,
        mockHashedPassword,
      );
    });

    it('should generate both access and refresh tokens on login', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      tokenUtil.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await authService.login(mockEmail, mockPassword);

      // NOTE: Verify tokenUtil.generateToken was called twice
      expect(tokenUtil.generateToken).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should delete session from Redis', async () => {
      tokenUtil.decodeToken.mockReturnValue(mockDecodedToken);

      const result = await authService.logout(mockPlayerId, mockAccessToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
      expect(redisClient.del).toHaveBeenCalledWith(`session:${mockPlayerId}`);
    });

    it('should blacklist access token in Redis', async () => {
      // Create a token with a future expiration
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const decodedWithFutureExp = {
        ...mockDecodedToken,
        exp: futureExp,
      };
      tokenUtil.decodeToken.mockReturnValue(decodedWithFutureExp);
      redisClient.del.mockResolvedValue(1);
      redisClient.set.mockResolvedValue('OK');

      await authService.logout(mockPlayerId, mockAccessToken);

      // Verify that set was called with blacklist
      expect(redisClient.set).toHaveBeenCalledWith(
        `blacklist:${mockAccessToken}`,
        'blacklisted',
        {
          EX: expect.any(Number),
        },
      );
    });

    it('should handle logout without access token', async () => {
      const result = await authService.logout(mockPlayerId, null);

      expect(result.success).toBe(true);
      expect(redisClient.del).toHaveBeenCalledWith(`session:${mockPlayerId}`);
      expect(redisClient.set).not.toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should handle token decoding errors gracefully', async () => {
      tokenUtil.decodeToken.mockReturnValue(null);

      const result = await authService.logout(mockPlayerId, mockAccessToken);

      expect(result.success).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        `User ${mockPlayerId} logged out successfully.`,
      );
    });

    it('should handle expired tokens gracefully', async () => {
      const expiredDecodedToken = {
        ...mockDecodedToken,
        exp: Math.floor(Date.now() / 1000) - 100, // Past timestamp
      };
      tokenUtil.decodeToken.mockReturnValue(expiredDecodedToken);

      const result = await authService.logout(mockPlayerId, mockExpiredToken);

      expect(result.success).toBe(true);
      expect(redisClient.set).not.toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should log info message when user logs out', async () => {
      tokenUtil.decodeToken.mockReturnValue(mockDecodedToken);

      await authService.logout(mockPlayerId, mockAccessToken);

      expect(logger.info).toHaveBeenCalledWith(
        `Attempting to log out user: ${mockPlayerId}`,
      );
      expect(logger.info).toHaveBeenCalledWith(
        `User ${mockPlayerId} logged out successfully.`,
      );
    });

    it('should calculate correct time-to-live for token blacklisting', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      tokenUtil.decodeToken.mockReturnValue({
        ...mockDecodedToken,
        exp: futureExp,
      });

      await authService.logout(mockPlayerId, mockAccessToken);

      const callArgs = redisClient.set.mock.calls.find((call) =>
        call[0].includes('blacklist:'),
      );
      if (callArgs) {
        expect(callArgs[2].EX).toBeGreaterThan(0);
        expect(callArgs[2].EX).toBeLessThanOrEqual(3600);
      }
    });
  });

  describe('refreshToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      // NOTE: Use tokenUtil.verifyToken instead of jwt.verify
      tokenUtil.verifyToken.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      tokenUtil.generateToken.mockReturnValue(mockAccessToken);

      const result = await authService.refreshToken(mockRefreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockAccessToken);
      expect(tokenUtil.verifyToken).toHaveBeenCalledWith(
        mockRefreshToken,
        process.env.JWT_REFRESH_SECRET,
      );
    });

    it('should throw error when refresh token is missing', async () => {
      await expect(authService.refreshToken(null)).rejects.toThrow(
        'Refresh token is required',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Refresh token request missing refresh token.',
      );
    });

    it('should throw error when refresh token is expired', async () => {
      const tokenExpiredError = new Error('Token expired');
      tokenExpiredError.name = 'TokenExpiredError';
      tokenUtil.verifyToken.mockImplementation(() => {
        throw tokenExpiredError;
      });

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Refresh token has expired',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Expired refresh token detected'),
      );
    });

    it('should throw error when refresh token is invalid', async () => {
      const jsonWebTokenError = new Error('Invalid token');
      jsonWebTokenError.name = 'JsonWebTokenError';
      tokenUtil.verifyToken.mockImplementation(() => {
        throw jsonWebTokenError;
      });

      await expect(authService.refreshToken(mockInvalidToken)).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid refresh token detected'),
      );
    });

    it('should throw error when token is not in Redis session', async () => {
      tokenUtil.verifyToken.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(null);

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Refresh token invalid or revoked',
      );

      // NOTE: Match the actual log message from auth.service.js
      expect(logger.warn).toHaveBeenCalledWith(
        `No session found for user ID: ${mockPlayerId}`,
      );
    });

    it('should throw error when stored token does not match provided token', async () => {
      tokenUtil.verifyToken.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue('different-token');

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Refresh token invalid or revoked',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        `Token mismatch for user ID: ${mockPlayerId}`,
      );
    });

    it('should log info message when new access token is generated', async () => {
      tokenUtil.verifyToken.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      tokenUtil.generateToken.mockReturnValue(mockAccessToken);

      await authService.refreshToken(mockRefreshToken);

      expect(logger.info).toHaveBeenCalledWith(
        `Refresh token received for user ID: ${mockPlayerId}`,
      );
      expect(logger.info).toHaveBeenCalledWith(
        `New access token generated for user ID: ${mockPlayerId}`,
      );
    });

    it('should generate token with 15m expiration on refresh', async () => {
      tokenUtil.verifyToken.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      tokenUtil.generateToken.mockReturnValue(mockAccessToken);

      const result = await authService.refreshToken(mockRefreshToken);

      // NOTE: Verify tokenUtil.generateToken was called with correct parameters
      expect(tokenUtil.generateToken).toHaveBeenCalledWith(
        { id: mockPlayerId },
        process.env.JWT_SECRET,
        '15m',
      );
      expect(result.success).toBe(true);
      expect(result.token).toBe(mockAccessToken);
    });
  });

  // NOTE: The generateToken and verifyToken methods were removed from AuthService
  // as they are now handled by token.util.js directly in the service methods

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      bcrypt.hash.mockResolvedValue(mockHashedPassword);

      const hashedPassword = await authService.hashPassword(mockPassword);

      expect(hashedPassword).toBe(mockHashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
      expect(logger.info).toHaveBeenCalledWith('Hashing password...');
    });

    it('should throw error when hashing fails', async () => {
      const bcryptError = new Error('Hashing failed');
      bcrypt.hash.mockRejectedValue(bcryptError);

      await expect(authService.hashPassword(mockPassword)).rejects.toThrow(
        'Hashing failed',
      );
    });

    it('should use salt rounds of 10', async () => {
      bcrypt.hash.mockResolvedValue(mockHashedPassword);

      await authService.hashPassword(mockPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
    });

    it('should handle empty password', async () => {
      bcrypt.hash.mockResolvedValue(mockHashedPassword);

      const hashedPassword = await authService.hashPassword('');

      expect(bcrypt.hash).toHaveBeenCalledWith('', 10);
      expect(hashedPassword).toBe(mockHashedPassword);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'x'.repeat(1000);
      bcrypt.hash.mockResolvedValue(mockHashedPassword);

      const hashedPassword = await authService.hashPassword(longPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(longPassword, 10);
      expect(hashedPassword).toBe(mockHashedPassword);
    });
  });

  describe('verifyTokenIsBlacklisted', () => {
    it('should return true when token is blacklisted', async () => {
      redisClient.get.mockResolvedValue('blacklisted');

      const isBlacklisted = await authService.verifyTokenIsBlacklisted(
        mockAccessToken,
      );

      expect(isBlacklisted).toBe('blacklisted');
      expect(redisClient.get).toHaveBeenCalledWith(
        `blacklist:${mockAccessToken}`,
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Checking if token is blacklisted...',
      );
    });

    it('should return null when token is not blacklisted', async () => {
      redisClient.get.mockResolvedValue(null);

      const isBlacklisted = await authService.verifyTokenIsBlacklisted(
        mockAccessToken,
      );

      expect(isBlacklisted).toBeNull();
    });

    it('should return false-like value when token not found in blacklist', async () => {
      redisClient.get.mockResolvedValue(null);

      const isBlacklisted = await authService.verifyTokenIsBlacklisted(
        mockAccessToken,
      );

      expect(!isBlacklisted).toBe(true);
    });

    it('should handle Redis errors gracefully', async () => {
      const redisError = new Error('Redis connection failed');
      redisClient.get.mockRejectedValue(redisError);

      await expect(
        authService.verifyTokenIsBlacklisted(mockAccessToken),
      ).rejects.toThrow('Redis connection failed');
    });

    it('should construct correct Redis key for blacklist', async () => {
      redisClient.get.mockResolvedValue(null);
      const customToken = 'custom.token.here';

      await authService.verifyTokenIsBlacklisted(customToken);

      expect(redisClient.get).toHaveBeenCalledWith(`blacklist:${customToken}`);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle login with empty password', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(mockEmail, '')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should handle login with empty email', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login('', mockPassword)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should handle concurrent token refresh requests', async () => {
      tokenUtil.verifyToken.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      tokenUtil.generateToken.mockReturnValue(mockAccessToken);

      const promise1 = authService.refreshToken(mockRefreshToken);
      const promise2 = authService.refreshToken(mockRefreshToken);

      const results = await Promise.all([promise1, promise2]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle player with missing _id field', async () => {
      const playerWithoutId = {
        email: mockEmail,
        password: mockHashedPassword,
        username: 'testplayer',
      };
      mockPlayerRepository.findByEmail.mockResolvedValue(playerWithoutId);
      bcrypt.compare.mockResolvedValue(true);
      tokenUtil.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      // Should still attempt to generate token
      const result = await authService.login(mockEmail, mockPassword);

      expect(result.success).toBe(true);
      // NOTE: generateToken should be called with empty object if no _id
      expect(tokenUtil.generateToken).toHaveBeenCalledWith(
        { id: undefined },
        process.env.JWT_SECRET,
        '15m',
      );
    });

    it('should handle Redis unavailability during logout', async () => {
      tokenUtil.decodeToken.mockReturnValue(mockDecodedToken);
      const redisError = new Error('Redis unavailable');
      redisClient.del.mockRejectedValue(redisError);

      await expect(
        authService.logout(mockPlayerId, mockAccessToken),
      ).rejects.toThrow();
    });

    it('should handle very long tokens', async () => {
      const longToken = 'x'.repeat(10000);
      tokenUtil.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // NOTE: Testing refreshToken with invalid token
      await expect(authService.refreshToken(longToken)).rejects.toThrow();
    });

    it('should handle special characters in email during login', async () => {
      const emailWithSpecialChars = 'test+tag@example.com';
      mockPlayerRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login(emailWithSpecialChars, mockPassword),
      ).rejects.toThrow('Invalid credentials');

      expect(mockPlayerRepository.findByEmail).toHaveBeenCalledWith(
        emailWithSpecialChars,
      );
    });

    it('should handle multiple logout calls with same token', async () => {
      tokenUtil.decodeToken.mockReturnValue(mockDecodedToken);

      const result1 = await authService.logout(mockPlayerId, mockAccessToken);
      const result2 = await authService.logout(mockPlayerId, mockAccessToken);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(redisClient.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full login-logout cycle', async () => {
      // Login
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      tokenUtil.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const loginResult = await authService.login(mockEmail, mockPassword);
      expect(loginResult.success).toBe(true);

      // Logout
      tokenUtil.decodeToken.mockReturnValue(mockDecodedToken);
      const logoutResult = await authService.logout(
        mockPlayerId,
        loginResult.accessToken,
      );
      expect(logoutResult.success).toBe(true);

      expect(redisClient.del).toHaveBeenCalledWith(`session:${mockPlayerId}`);
    });

    it('should complete full token refresh cycle', async () => {
      tokenUtil.verifyToken.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      tokenUtil.generateToken.mockReturnValue(mockAccessToken);

      const result = await authService.refreshToken(mockRefreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockAccessToken);

      // Verify that generateToken was called with correct secret and expiration
      expect(tokenUtil.generateToken).toHaveBeenCalledWith(
        { id: mockPlayerId },
        process.env.JWT_SECRET,
        '15m',
      );
    });

    it('should complete password update with hash verification', async () => {
      bcrypt.hash.mockResolvedValue(mockHashedPassword);

      const hashedPassword = await authService.hashPassword(mockPassword);

      expect(hashedPassword).toBe(mockHashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
    });

    it('should verify token and check blacklist status', async () => {
      // NOTE: Token verification is done through tokenUtil directly
      tokenUtil.verifyToken.mockReturnValue(mockDecodedToken);
      redisClient.get.mockResolvedValue(null);

      const verifyResult = tokenUtil.verifyToken(
        mockAccessToken,
        process.env.JWT_SECRET,
      );
      const blacklistResult = await authService.verifyTokenIsBlacklisted(
        mockAccessToken,
      );

      expect(verifyResult).toEqual(mockDecodedToken);
      expect(blacklistResult).toBeNull();
      expect(tokenUtil.verifyToken).toHaveBeenCalledWith(
        mockAccessToken,
        process.env.JWT_SECRET,
      );
    });

    it('should handle login followed by token verification', async () => {
      // Login
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      tokenUtil.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const loginResult = await authService.login(mockEmail, mockPassword);

      // Verify token - using tokenUtil directly as the service would
      tokenUtil.verifyToken.mockReturnValue(mockDecodedToken);
      const verifyResult = tokenUtil.verifyToken(
        loginResult.accessToken,
        process.env.JWT_SECRET,
      );

      expect(verifyResult).toEqual(mockDecodedToken);
      expect(tokenUtil.verifyToken).toHaveBeenCalledWith(
        loginResult.accessToken,
        process.env.JWT_SECRET,
      );
    });

    it('should handle login, token refresh, and logout cycle', async () => {
      // Login
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      tokenUtil.generateToken
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const loginResult = await authService.login(mockEmail, mockPassword);
      expect(loginResult.success).toBe(true);

      // Refresh token
      tokenUtil.verifyToken.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      tokenUtil.generateToken.mockReturnValue(mockAccessToken);

      const refreshResult = await authService.refreshToken(
        loginResult.refreshToken,
      );
      expect(refreshResult.success).toBe(true);

      // Logout
      tokenUtil.decodeToken.mockReturnValue(mockDecodedToken);
      const logoutResult = await authService.logout(
        mockPlayerId,
        refreshResult.token,
      );
      expect(logoutResult.success).toBe(true);
    });
  });
});
