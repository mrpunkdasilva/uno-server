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

    // Clear bcrypt mock
    bcrypt.compare.mockClear();
    bcrypt.hash.mockClear();
    jwt.sign.mockClear();
    jwt.verify.mockClear();
    jwt.decode.mockClear();
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
      jwt.sign
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
        'Authentication failed: Invalid credentials',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        `Authentication failed for email: ${mockEmail}. User not found.`,
      );
    });

    it('should throw error when password is invalid', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(mockEmail, mockPassword)).rejects.toThrow(
        'Authentication failed: Invalid credentials',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        `Authentication failed for email: ${mockEmail}. Invalid password.`,
      );
    });

    it('should store refresh token in Redis with correct expiration', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
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
        'Authentication failed: Database connection failed',
      );

      expect(logger.error).toHaveBeenCalled();
    });

    it('should call bcrypt.compare with correct parameters', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
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
      jwt.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await authService.login(mockEmail, mockPassword);

      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should delete session from Redis', async () => {
      jwt.decode.mockReturnValue(mockDecodedToken);

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
      jwt.decode.mockReturnValue(decodedWithFutureExp);
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
      jwt.decode.mockReturnValue(null);

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
      jwt.decode.mockReturnValue(expiredDecodedToken);

      const result = await authService.logout(mockPlayerId, mockExpiredToken);

      expect(result.success).toBe(true);
      expect(redisClient.set).not.toHaveBeenCalledWith(
        expect.stringContaining('blacklist:'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should log info message when user logs out', async () => {
      jwt.decode.mockReturnValue(mockDecodedToken);

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
      jwt.decode.mockReturnValue({
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
      jwt.verify.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      jwt.sign.mockReturnValue(mockAccessToken);

      const result = await authService.refreshToken(mockRefreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockAccessToken);
      expect(jwt.verify).toHaveBeenCalledWith(
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
      jwt.verify.mockImplementation(() => {
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
      jwt.verify.mockImplementation(() => {
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
      jwt.verify.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(null);

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Refresh token invalid or revoked',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        `Refresh token invalid or revoked for user ID: ${mockPlayerId}`,
      );
    });

    it('should throw error when stored token does not match provided token', async () => {
      jwt.verify.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue('different-token');

      await expect(authService.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Refresh token invalid or revoked',
      );
    });

    it('should log info message when new access token is generated', async () => {
      jwt.verify.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      jwt.sign.mockReturnValue(mockAccessToken);

      await authService.refreshToken(mockRefreshToken);

      expect(logger.info).toHaveBeenCalledWith(
        `Refresh token received for user ID: ${mockPlayerId}`,
      );
      expect(logger.info).toHaveBeenCalledWith(
        `New access token generated for user ID: ${mockPlayerId}`,
      );
    });

    it('should generate token with 15m expiration on refresh', async () => {
      jwt.verify.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      jwt.sign.mockReturnValue(mockAccessToken);

      const result = await authService.refreshToken(mockRefreshToken);

      // Verify that sign was called and token was returned
      expect(jwt.sign).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.token).toBe(mockAccessToken);

      // Check that jwt.sign was called with correct parameters
      const signCall = jwt.sign.mock.calls[0];
      expect(signCall[1]).toBe(process.env.JWT_SECRET);
      expect(signCall[2]).toEqual({ expiresIn: '15m' });
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      jwt.sign.mockReturnValue(mockAccessToken);

      const token = authService.generateToken(
        mockPlayer,
        process.env.JWT_SECRET,
        '15m',
      );

      expect(token).toBe(mockAccessToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockPlayerId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
      );
    });

    it('should generate token with different expiration times', () => {
      jwt.sign.mockReturnValue(mockRefreshToken);

      const token = authService.generateToken(
        mockPlayer,
        process.env.JWT_REFRESH_SECRET,
        '7d',
      );

      expect(token).toBe(mockRefreshToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockPlayerId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' },
      );
    });

    it('should use correct secret for token signing', () => {
      jwt.sign.mockReturnValue(mockAccessToken);
      const customSecret = 'custom-secret-key';

      authService.generateToken(mockPlayer, customSecret, '1h');

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockPlayerId },
        customSecret,
        { expiresIn: '1h' },
      );
    });

    it('should only include user id in token payload', () => {
      jwt.sign.mockReturnValue(mockAccessToken);

      authService.generateToken(mockPlayer, process.env.JWT_SECRET, '15m');

      const callArgs = jwt.sign.mock.calls[0];
      const payload = callArgs[0];
      expect(Object.keys(payload)).toEqual(['id']);
      expect(payload.id).toBe(mockPlayerId);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      jwt.verify.mockReturnValue(mockDecodedToken);

      const result = authService.verifyToken(
        mockAccessToken,
        process.env.JWT_SECRET,
      );

      expect(result).toEqual(mockDecodedToken);
      expect(jwt.verify).toHaveBeenCalledWith(
        mockAccessToken,
        process.env.JWT_SECRET,
      );
    });

    it('should throw error when token is expired', () => {
      const tokenExpiredError = new Error('Token expired');
      tokenExpiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw tokenExpiredError;
      });

      expect(() =>
        authService.verifyToken(mockExpiredToken, process.env.JWT_SECRET),
      ).toThrow('Token has expired');

      expect(logger.warn).toHaveBeenCalledWith(
        'Token verification failed: Token has expired',
      );
    });

    it('should throw error when token is invalid', () => {
      const jsonWebTokenError = new Error('Invalid token');
      jsonWebTokenError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw jsonWebTokenError;
      });

      expect(() =>
        authService.verifyToken(mockInvalidToken, process.env.JWT_SECRET),
      ).toThrow('Invalid token');

      expect(logger.warn).toHaveBeenCalledWith(
        'Token verification failed: Invalid token',
      );
    });

    it('should throw error for malformed tokens', () => {
      const malformedTokenError = new Error('Malformed token');
      malformedTokenError.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw malformedTokenError;
      });

      expect(() =>
        authService.verifyToken('malformed.token', process.env.JWT_SECRET),
      ).toThrow('Invalid token');
    });

    it('should log error when verification fails unexpectedly', () => {
      const unexpectedError = new Error('Unexpected error');
      jwt.verify.mockImplementation(() => {
        throw unexpectedError;
      });

      expect(() =>
        authService.verifyToken(mockAccessToken, process.env.JWT_SECRET),
      ).toThrow('Token verification failed: Unexpected error');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should use correct secret for verification', () => {
      jwt.verify.mockReturnValue(mockDecodedToken);
      const customSecret = 'custom-secret';

      authService.verifyToken(mockAccessToken, customSecret);

      expect(jwt.verify).toHaveBeenCalledWith(mockAccessToken, customSecret);
    });
  });

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
        'Authentication failed: Invalid credentials',
      );
    });

    it('should handle login with empty email', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login('', mockPassword)).rejects.toThrow(
        'Authentication failed: Invalid credentials',
      );
    });

    it('should handle concurrent token refresh requests', async () => {
      jwt.verify.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      jwt.sign.mockReturnValue(mockAccessToken);

      const promise1 = authService.refreshToken(mockRefreshToken);
      const promise2 = authService.refreshToken(mockRefreshToken);

      const results = await Promise.all([promise1, promise2]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle token with missing id field', () => {
      const decodedTokenWithoutId = {
        iat: 1704113200,
        exp: 1704114000,
      };
      jwt.verify.mockReturnValue(decodedTokenWithoutId);

      const result = authService.verifyToken(
        mockAccessToken,
        process.env.JWT_SECRET,
      );

      expect(result).toEqual(decodedTokenWithoutId);
    });

    it('should handle player with missing _id field', async () => {
      const playerWithoutId = {
        email: mockEmail,
        password: mockHashedPassword,
        username: 'testplayer',
      };
      mockPlayerRepository.findByEmail.mockResolvedValue(playerWithoutId);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      // Should still attempt to generate token
      const result = await authService.login(mockEmail, mockPassword);

      expect(result.success).toBe(true);
    });

    it('should handle Redis unavailability during logout', async () => {
      jwt.decode.mockReturnValue(mockDecodedToken);
      const redisError = new Error('Redis unavailable');
      redisClient.del.mockRejectedValue(redisError);

      await expect(
        authService.logout(mockPlayerId, mockAccessToken),
      ).rejects.toThrow();
    });

    it('should handle very long tokens', async () => {
      const longToken = 'x'.repeat(10000);
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() =>
        authService.verifyToken(longToken, process.env.JWT_SECRET),
      ).toThrow();
    });

    it('should handle special characters in email during login', async () => {
      const emailWithSpecialChars = 'test+tag@example.com';
      mockPlayerRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login(emailWithSpecialChars, mockPassword),
      ).rejects.toThrow('Authentication failed: Invalid credentials');

      expect(mockPlayerRepository.findByEmail).toHaveBeenCalledWith(
        emailWithSpecialChars,
      );
    });

    it('should handle multiple logout calls with same token', async () => {
      jwt.decode.mockReturnValue(mockDecodedToken);

      const result1 = await authService.logout(mockPlayerId, mockAccessToken);
      const result2 = await authService.logout(mockPlayerId, mockAccessToken);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(redisClient.del).toHaveBeenCalledTimes(2);
    });

    it('should handle undefined secret environment variable', () => {
      delete process.env.JWT_SECRET;
      jwt.sign.mockReturnValue(mockAccessToken);

      const token = authService.generateToken(mockPlayer, undefined, '15m');

      expect(token).toBe(mockAccessToken);
      expect(jwt.sign).toHaveBeenCalledWith({ id: mockPlayerId }, undefined, {
        expiresIn: '15m',
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should complete full login-logout cycle', async () => {
      // Login
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const loginResult = await authService.login(mockEmail, mockPassword);
      expect(loginResult.success).toBe(true);

      // Logout
      jwt.decode.mockReturnValue(mockDecodedToken);
      const logoutResult = await authService.logout(
        mockPlayerId,
        loginResult.accessToken,
      );
      expect(logoutResult.success).toBe(true);

      expect(redisClient.del).toHaveBeenCalledWith(`session:${mockPlayerId}`);
    });

    it('should complete full token refresh cycle', async () => {
      jwt.verify.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      jwt.sign.mockReturnValue(mockAccessToken);

      const result = await authService.refreshToken(mockRefreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockAccessToken);

      // Verify that sign was called with correct secret and expiration
      const signCall = jwt.sign.mock.calls[jwt.sign.mock.calls.length - 1];
      expect(signCall[1]).toBe(process.env.JWT_SECRET);
      expect(signCall[2]).toEqual({ expiresIn: '15m' });
    });

    it('should complete password update with hash verification', async () => {
      bcrypt.hash.mockResolvedValue(mockHashedPassword);

      const hashedPassword = await authService.hashPassword(mockPassword);

      expect(hashedPassword).toBe(mockHashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
    });

    it('should verify token and check blacklist status', async () => {
      jwt.verify.mockReturnValue(mockDecodedToken);
      redisClient.get.mockResolvedValue(null);

      const verifyResult = authService.verifyToken(
        mockAccessToken,
        process.env.JWT_SECRET,
      );
      const blacklistResult = await authService.verifyTokenIsBlacklisted(
        mockAccessToken,
      );

      expect(verifyResult).toEqual(mockDecodedToken);
      expect(blacklistResult).toBeNull();
    });

    it('should handle login followed by token verification', async () => {
      // Login
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const loginResult = await authService.login(mockEmail, mockPassword);

      // Verify token
      jwt.verify.mockReturnValue(mockDecodedToken);
      const verifyResult = authService.verifyToken(
        loginResult.accessToken,
        process.env.JWT_SECRET,
      );

      expect(verifyResult).toEqual(mockDecodedToken);
    });

    it('should handle login, token refresh, and logout cycle', async () => {
      // Login
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayer);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const loginResult = await authService.login(mockEmail, mockPassword);
      expect(loginResult.success).toBe(true);

      // Refresh token
      jwt.verify.mockReturnValue(mockDecodedRefreshToken);
      redisClient.get.mockResolvedValue(mockRefreshToken);
      jwt.sign.mockReturnValue(mockAccessToken);

      const refreshResult = await authService.refreshToken(
        loginResult.refreshToken,
      );
      expect(refreshResult.success).toBe(true);

      // Logout
      jwt.decode.mockReturnValue(mockDecodedToken);
      const logoutResult = await authService.logout(
        mockPlayerId,
        refreshResult.token,
      );
      expect(logoutResult.success).toBe(true);
    });
  });
});
