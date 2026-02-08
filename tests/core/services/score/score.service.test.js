import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import ScoreService from '../../../../src/core/services/score.service.js';
import ScoreRepository from '../../../../src/infra/repositories/score.repository.js';
import logger from '../../../../src/config/logger.js';

// Mock dependencies
jest.mock('../../../../src/infra/repositories/score.repository.js');
jest.mock('../../../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('ScoreService Unit Tests', () => {
  let scoreService;
  let mockScoreRepository;

  // Mock Data
  const mockScoreId = 'score-123';
  const mockPlayerId = 'player-123';
  const mockMatchId = 'match-123';
  const mockScoreData = {
    _id: mockScoreId,
    playerId: mockPlayerId,
    matchId: mockMatchId,
    score: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Repository Mock
    mockScoreRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByMatchId: jest.fn(),
    };

    // Apply mock implementation
    ScoreRepository.mockImplementation(() => mockScoreRepository);

    // Initialize Service
    scoreService = new ScoreService();
    // Force injection of the mock into the service instance
    scoreService.scoreRepository = mockScoreRepository;
  });

  /**
   * Implement Unit Tests for Score CRUD Operations
   */

  describe('createScore', () => {
    it('should successfully create a score and return a Success Result', async () => {
      // Arrange
      const inputData = { playerId: mockPlayerId, score: 50 };
      const createdScore = { ...mockScoreData, score: 50 };
      mockScoreRepository.create.mockResolvedValue(createdScore);

      // Act
      const result = await scoreService.createScore(inputData);

      // Assert
      expect(mockScoreRepository.create).toHaveBeenCalledWith(inputData);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(createdScore);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Attempting to create a new score`),
      );
    });

    it('should return a Failure Result when repository returns null', async () => {
      // Arrange
      mockScoreRepository.create.mockResolvedValue(null);

      // Act
      const result = await scoreService.createScore({ playerId: mockPlayerId });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('Failed to create score');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getAllScores', () => {
    it('should retrieve all scores and return a Success Result', async () => {
      // Arrange
      const scoresList = [
        mockScoreData,
        { ...mockScoreData, _id: 'score-456' },
      ];
      mockScoreRepository.findAll.mockResolvedValue(scoresList);

      // Act
      const result = await scoreService.getAllScores();

      // Assert
      expect(mockScoreRepository.findAll).toHaveBeenCalled();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully retrieved 2 scores'),
      );
    });

    it('should handle errors during retrieval', async () => {
      // Arrange
      mockScoreRepository.findAll.mockRejectedValue(new Error('DB Error'));

      // Act
      const result = await scoreService.getAllScores();

      // Assert
      expect(result.isFailure).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retrieve all scores'),
      );
    });
  });

  describe('getScoreById', () => {
    it('should return a score when found', async () => {
      // Arrange
      mockScoreRepository.findById.mockResolvedValue(mockScoreData);

      // Act
      const result = await scoreService.getScoreById(mockScoreId);

      // Assert
      expect(mockScoreRepository.findById).toHaveBeenCalledWith(mockScoreId);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockScoreData);
    });

    it('should return Failure when score is not found', async () => {
      // Arrange
      mockScoreRepository.findById.mockResolvedValue(null);

      // Act
      const result = await scoreService.getScoreById('invalid-id');

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Score not found');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
    });
  });

  describe('updateScore', () => {
    it('should update a score successfully', async () => {
      // Arrange
      const updateData = { score: 200 };
      const updatedScore = { ...mockScoreData, score: 200 };
      mockScoreRepository.update.mockResolvedValue(updatedScore);

      // Act
      const result = await scoreService.updateScore(mockScoreId, updateData);

      // Assert
      expect(mockScoreRepository.update).toHaveBeenCalledWith(
        mockScoreId,
        updateData,
      );
      expect(result.isSuccess).toBe(true);
      expect(result.value.score).toBe(200);
    });

    it('should return Failure when updating a non-existent score', async () => {
      // Arrange
      mockScoreRepository.update.mockResolvedValue(null);

      // Act
      const result = await scoreService.updateScore('invalid-id', {});

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Score not found');
    });
  });

  describe('deleteScore', () => {
    it('should delete a score successfully', async () => {
      // Arrange
      mockScoreRepository.delete.mockResolvedValue(mockScoreData);

      // Act
      const result = await scoreService.deleteScore(mockScoreId);

      // Assert
      expect(mockScoreRepository.delete).toHaveBeenCalledWith(mockScoreId);
      expect(result.isSuccess).toBe(true);
    });

    it('should return Failure when deleting a non-existent score', async () => {
      // Arrange
      mockScoreRepository.delete.mockResolvedValue(null);

      // Act
      const result = await scoreService.deleteScore('invalid-id');

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Score not found');
    });
  });

  /**
   * Get Current Scores of All Players (For a specific match)
   */
  describe('getScoresByMatchId (Task 19 Requirement)', () => {
    it('should retrieve scores for a specific match', async () => {
      // Arrange
      const matchScores = [
        { playerId: 'p1', score: 10, matchId: mockMatchId },
        { playerId: 'p2', score: 25, matchId: mockMatchId },
      ];

      // We assume this method exists or will be added to the Service
      mockScoreRepository.findByMatchId.mockResolvedValue(matchScores);

      // Act
      const result = await scoreService.getScoresByMatchId(mockMatchId);

      // Assert
      expect(mockScoreRepository.findByMatchId).toHaveBeenCalledWith(
        mockMatchId,
      );
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value[0].playerId).toBe('p1');
    });
  });
});
