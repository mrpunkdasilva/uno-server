jest.mock('../../../../src/infra/repositories/player.repository.js');
jest.mock('../../../../src/presentation/dtos/player/player-response.dto.js');
jest.mock('bcrypt');
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
import PlayerService from '../../../../src/core/services/player.service.js';
import PlayerRepository from '../../../../src/infra/repositories/player.repository.js';
import playerResponseDtoSchema from '../../../../src/presentation/dtos/player/player-response.dto.js';
import bcrypt from 'bcrypt';
import logger from '../../../../src/config/logger.js';

// Import all mocks from centralized mock file
import {
  mockPlayerDoc,
  mockPlayerDoc2,
  mockPlayerDoc3,
  mockParsedPlayer,
  mockCreatePlayerData,
  mockCreatedPlayerDoc,
  mockCreatedParsedPlayer,
  mockUpdatePlayerData,
  mockUpdatePasswordData,
  mockPlayerRepository,
  resetAllMocks,
  setupDefaultMocks,
} from '../../../../src/mocks/player.mocks.js';

describe('PlayerService', () => {
  let playerService;

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

    // Mock schema parse
    playerResponseDtoSchema.parse = mocks.schemas.playerResponseDtoSchema.parse;

    // Create service instance
    playerService = new PlayerService(mocks.playerRepository);

    // Clear bcrypt mock
    bcrypt.hash.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with PlayerRepository instance', () => {
      expect(playerService.playerRepository).toBeDefined();
      expect(typeof playerService.playerRepository.findAll).toBe('function');
    });

    it('should create a new PlayerRepository instance when none is provided', () => {
      const service = new PlayerService();
      expect(service.playerRepository).toBeDefined();
    });
  });

  describe('getAllPlayers', () => {
    it('should return all players formatted as DTO', async () => {
      const mockPlayers = [mockPlayerDoc, mockPlayerDoc2];
      mockPlayerRepository.findAll.mockResolvedValue(mockPlayers);
      playerResponseDtoSchema.parse.mockImplementation((data) => ({
        id: data._id.toString(),
        email: data.email,
        username: data.username,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }));

      const result = await playerService.getAllPlayers();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toHaveProperty('id');
      expect(result.value[0]).toHaveProperty('email');
      expect(result.value[0]).toHaveProperty('username');
      expect(mockPlayerRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no players exist', async () => {
      mockPlayerRepository.findAll.mockResolvedValue([]);

      const result = await playerService.getAllPlayers();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('should log info message when retrieving players', async () => {
      mockPlayerRepository.findAll.mockResolvedValue([]);

      await playerService.getAllPlayers();

      expect(logger.info).toHaveBeenCalledWith(
        'Attempting to retrieve all players.',
      );
    });
  });

  describe('createPlayer', () => {
    it('should create player with valid data', async () => {
      const hashedPassword = '$2b$10$hashedPassword';
      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(mockCreatedPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockCreatedParsedPlayer);

      const result = await playerService.createPlayer(mockCreatePlayerData);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('id');
      expect(result.value).toHaveProperty('email', mockCreatePlayerData.email);
      expect(result.value).toHaveProperty(
        'username',
        mockCreatePlayerData.username,
      );
      expect(mockPlayerRepository.findByEmail).toHaveBeenCalledWith(
        mockCreatePlayerData.email,
      );
      expect(mockPlayerRepository.findByUsername).toHaveBeenCalledWith(
        mockCreatePlayerData.username,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(
        mockCreatePlayerData.password,
        10,
      );
      expect(mockPlayerRepository.create).toHaveBeenCalled();
    });

    it('should throw error when email already exists', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayerDoc);

      const result = await playerService.createPlayer(mockCreatePlayerData);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('already exists');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw error when username already exists', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(mockPlayerDoc);

      const result = await playerService.createPlayer(mockCreatePlayerData);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('already exists');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should hash password before saving', async () => {
      const hashedPassword = '$2b$10$hashedPassword';
      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(mockCreatedPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockCreatedParsedPlayer);

      await playerService.createPlayer(mockCreatePlayerData);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        mockCreatePlayerData.password,
        10,
      );
      expect(mockPlayerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: hashedPassword,
        }),
      );
    });

    it('should throw error when repository create returns null', async () => {
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(null);

      const result = await playerService.createPlayer(mockCreatePlayerData);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('Failed to create player');
    });

    it('should log info message when player is created successfully', async () => {
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(mockCreatedPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockCreatedParsedPlayer);

      await playerService.createPlayer(mockCreatePlayerData);

      expect(logger.info).toHaveBeenCalledWith(
        'Attempting to create a new player with email: newplayer@example.com and username: newplayer.',
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Password hashed for new player.',
      );
    });
  });

  describe('getPlayerById', () => {
    it('should return specific player when found', async () => {
      const playerId = '507f1f77bcf86cd799439011';
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      const result = await playerService.getPlayerById(playerId);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('id', playerId);
      expect(result.value).toHaveProperty('email');
      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(playerId);
    });

    it('should throw Player not found error', async () => {
      const playerId = 'nonexistent-id';
      mockPlayerRepository.findById.mockResolvedValue(null);

      const result = await playerService.getPlayerById(playerId);

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Player not found');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should log warning when player not found', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await playerService.getPlayerById('invalid-id');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
    });

    it('should log error on database error', async () => {
      const mockError = new Error('Database error');
      mockPlayerRepository.findById.mockRejectedValue(mockError);

      await playerService.getPlayerById('any-id');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getPlayerByEmail', () => {
    it('should return player when found by email', async () => {
      const email = 'player1@example.com';
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      const result = await playerService.getPlayerByEmail(email);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('email', email);
      expect(mockPlayerRepository.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw Player not found error when email does not exist', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(null);

      const result = await playerService.getPlayerByEmail(
        'nonexistent@example.com',
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Player not found');
    });

    it('should log info message when attempting to retrieve by email', async () => {
      mockPlayerRepository.findByEmail.mockResolvedValue(null);

      await playerService.getPlayerByEmail('test@example.com');

      expect(logger.info).toHaveBeenCalledWith(
        'Attempting to retrieve player by email: test@example.com',
      );
    });
  });

  describe('getPlayerByUsername', () => {
    it('should return player when found by username', async () => {
      const username = 'player1';
      mockPlayerRepository.findByUsername.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      const result = await playerService.getPlayerByUsername(username);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveProperty('username', username);
      expect(mockPlayerRepository.findByUsername).toHaveBeenCalledWith(
        username,
      );
    });

    it('should throw Player not found error when username does not exist', async () => {
      mockPlayerRepository.findByUsername.mockResolvedValue(null);

      const result = await playerService.getPlayerByUsername('nonexistent');

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Player not found');
    });

    it('should log warning when player not found by username', async () => {
      mockPlayerRepository.findByUsername.mockResolvedValue(null);

      await playerService.getPlayerByUsername('invalid-username');

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('updatePlayer', () => {
    it('should update existing player', async () => {
      const playerId = '507f1f77bcf86cd799439011';
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(null);
      const updatedPlayerDoc = {
        ...mockPlayerDoc,
        ...mockUpdatePlayerData,
      };
      mockPlayerRepository.update.mockResolvedValue(updatedPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue({
        ...mockParsedPlayer,
        ...mockUpdatePlayerData,
      });

      const result = await playerService.updatePlayer(
        playerId,
        mockUpdatePlayerData,
      );

      expect(result.isSuccess).toBe(true);
      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(mockPlayerRepository.update).toHaveBeenCalled();
    });

    it('should throw error when player not found for update', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      const result = await playerService.updatePlayer(
        'nonexistent-id',
        mockUpdatePlayerData,
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Player not found');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw error when new email already in use', async () => {
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.findByEmail.mockResolvedValue(mockPlayerDoc2);

      const result = await playerService.updatePlayer(
        '507f1f77bcf86cd799439011',
        {
          email: 'player2@example.com',
        },
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('already in use');
    });

    it('should throw error when new username already in use', async () => {
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.findByUsername.mockResolvedValue(mockPlayerDoc2);

      const result = await playerService.updatePlayer(
        '507f1f77bcf86cd799439011',
        {
          username: 'player2',
        },
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('already in use');
    });

    it('should hash password when updating password', async () => {
      const playerId = '507f1f77bcf86cd799439011';
      const hashedPassword = '$2b$10$newHashedPassword';
      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.update.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      await playerService.updatePlayer(playerId, mockUpdatePasswordData);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        mockUpdatePasswordData.password,
        10,
      );
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(
        playerId,
        expect.objectContaining({
          password: hashedPassword,
        }),
      );
    });

    it('should not update email if it has not changed', async () => {
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.update.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      await playerService.updatePlayer('507f1f77bcf86cd799439011', {
        email: 'player1@example.com', // Same email
      });

      expect(mockPlayerRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should log info message when player is updated successfully', async () => {
      const playerId = '507f1f77bcf86cd799439011';
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.update.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      await playerService.updatePlayer(playerId, { username: 'newusername' });

      expect(logger.info).toHaveBeenCalledWith(
        'Attempting to update player with ID: 507f1f77bcf86cd799439011',
      );
    });
  });

  describe('deletePlayer', () => {
    it('should delete existing player', async () => {
      const playerId = '507f1f77bcf86cd799439011';
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.delete.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      const result = await playerService.deletePlayer(playerId);

      expect(result.isSuccess).toBe(true);
      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(playerId);
      expect(mockPlayerRepository.delete).toHaveBeenCalledWith(playerId);
    });

    it('should throw error when player not found for deletion', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      const result = await playerService.deletePlayer('nonexistent-id');

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Player not found');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should log info message when player is deleted successfully', async () => {
      const playerId = '507f1f77bcf86cd799439011';
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.delete.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      await playerService.deletePlayer(playerId);

      expect(logger.info).toHaveBeenCalledWith(
        'Attempting to delete player with ID: 507f1f77bcf86cd799439011',
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Player with ID 507f1f77bcf86cd799439011 deleted successfully.',
      );
    });

    it('should call repository delete with string ID', async () => {
      const playerId = '507f1f77bcf86cd799439011';
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      mockPlayerRepository.delete.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      await playerService.deletePlayer(playerId);

      expect(mockPlayerRepository.delete).toHaveBeenCalledWith(playerId);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty ID strings for getPlayerById', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      const result = await playerService.getPlayerById('');

      expect(result.isFailure).toBe(true);
    });

    it('should handle undefined IDs for getPlayerById', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      const result = await playerService.getPlayerById(undefined);

      expect(result.isFailure).toBe(true);
    });

    it('should maintain input object immutability on create', async () => {
      const originalData = {
        email: 'player@example.com',
        username: 'player',
        password: 'password123',
      };
      const dataCopy = { ...originalData };

      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(mockCreatedPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockCreatedParsedPlayer);

      await playerService.createPlayer(originalData);

      expect(originalData).toEqual(dataCopy);
    });

    it('should convert ObjectId to string in DTO', async () => {
      const playerId = '507f1f77bcf86cd799439011';
      const playerWithObjectId = {
        ...mockPlayerDoc,
        _id: { toString: () => playerId },
      };

      mockPlayerRepository.findById.mockResolvedValue(playerWithObjectId);
      playerResponseDtoSchema.parse.mockImplementation((data) => ({
        id: data._id.toString(),
        email: data.email,
        username: data.username,
      }));

      const result = await playerService.getPlayerById(playerId);

      expect(result.value.id).toBe(playerId);
    });

    it('should handle repository error gracefully on getAllPlayers', async () => {
      const error = new Error('Database connection error');
      mockPlayerRepository.findAll.mockRejectedValue(error);

      const result = await playerService.getAllPlayers();

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle bcrypt hash errors during createPlayer', async () => {
      const bcryptError = new Error('Bcrypt error');
      bcrypt.hash.mockRejectedValue(bcryptError);
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(null);

      const result = await playerService.createPlayer(mockCreatePlayerData);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(bcryptError);
    });

    it('should handle bcrypt hash errors during updatePlayer', async () => {
      const bcryptError = new Error('Bcrypt error');
      bcrypt.hash.mockRejectedValue(bcryptError);
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);

      const result = await playerService.updatePlayer(
        '507f1f77bcf86cd799439011',
        { password: 'newpassword' },
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(bcryptError);
    });

    it('should return formatted response for toObject method', async () => {
      const playerWithToObject = {
        toObject: jest.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'player@example.com',
          username: 'player',
        }),
      };

      mockPlayerRepository.findById.mockResolvedValue(playerWithToObject);
      playerResponseDtoSchema.parse.mockImplementation((data) => ({
        id: data._id,
        email: data.email,
        username: data.username,
      }));

      const result = await playerService.getPlayerById(
        '507f1f77bcf86cd799439011',
      );

      expect(result.isSuccess).toBe(true);
      expect(playerWithToObject.toObject).toHaveBeenCalled();
    });

    it('should handle multiple players with concurrent operations', async () => {
      mockPlayerRepository.findAll.mockResolvedValue([
        mockPlayerDoc,
        mockPlayerDoc2,
        mockPlayerDoc3,
      ]);
      playerResponseDtoSchema.parse.mockImplementation((data) => ({
        id: data._id.toString ? data._id.toString() : data._id,
        email: data.email,
        username: data.username,
      }));

      const result = await playerService.getAllPlayers();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(3);
    });
  });

  describe('Result Pattern Tests', () => {
    it('should return Result object from createPlayer', async () => {
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPlayerRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findByUsername.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(mockCreatedPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockCreatedParsedPlayer);

      const result = await playerService.createPlayer(mockCreatePlayerData);

      expect(result).toHaveProperty('isSuccess');
      expect(result).toHaveProperty('isFailure');
      expect(result).toHaveProperty('value');
      expect(typeof result.isSuccess).toBe('boolean');
    });

    it('should return Result object from getPlayerById', async () => {
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      const result = await playerService.getPlayerById(
        '507f1f77bcf86cd799439011',
      );

      expect(result).toHaveProperty('isSuccess');
      expect(result).toHaveProperty('isFailure');
      expect(typeof result.isSuccess).toBe('boolean');
    });

    it('should have proper error structure in failed Result', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      const result = await playerService.getPlayerById('invalid-id');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should have proper value structure in successful Result', async () => {
      mockPlayerRepository.findById.mockResolvedValue(mockPlayerDoc);
      playerResponseDtoSchema.parse.mockReturnValue(mockParsedPlayer);

      const result = await playerService.getPlayerById(
        '507f1f77bcf86cd799439011',
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.error).toBeNull();
    });
  });
});
