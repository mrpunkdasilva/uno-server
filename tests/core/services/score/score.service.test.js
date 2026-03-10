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
      save: jest.fn(),
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
      const inputData = {
        playerId: mockPlayerId,
        matchId: mockMatchId,
        score: 50,
      };
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

    it('should return a Failure Result when playerId is missing', async () => {
      const inputData = { matchId: mockMatchId, score: 50 };
      const result = await scoreService.createScore(inputData);
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('playerId is required');
    });

    it('should return a Failure Result when matchId is missing', async () => {
      const inputData = { playerId: mockPlayerId, score: 50 };
      const result = await scoreService.createScore(inputData);
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('matchId is required');
    });

    it('should return a Failure Result when score is missing', async () => {
      const inputData = { playerId: mockPlayerId, matchId: mockMatchId };
      const result = await scoreService.createScore(inputData);
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('score is required');
    });

    it('should return a Failure Result when score is negative', async () => {
      const inputData = {
        playerId: mockPlayerId,
        matchId: mockMatchId,
        score: -10,
      };
      const result = await scoreService.createScore(inputData);
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('score cannot be negative');
    });

    it('should return a Failure Result when repository returns null', async () => {
      // Arrange
      const inputData = {
        playerId: mockPlayerId,
        matchId: mockMatchId,
        score: 50,
      };
      mockScoreRepository.create.mockResolvedValue(null);

      // Act
      const result = await scoreService.createScore(inputData);

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

    it('should log error for unexpected exceptions', async () => {
      mockScoreRepository.findById.mockRejectedValue(
        new Error('Unexpected error'),
      );
      const result = await scoreService.getScoreById(mockScoreId);
      expect(result.isFailure).toBe(true);
      expect(logger.error).toHaveBeenCalled();
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

    it('should return Failure when no data is provided for update', async () => {
      const result = await scoreService.updateScore(mockScoreId, {});
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('No data provided for update');
    });

    it('should return Failure when updating to negative score', async () => {
      const result = await scoreService.updateScore(mockScoreId, { score: -5 });
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('score cannot be negative');
    });

    it('should return Failure when updating a non-existent score', async () => {
      // Arrange
      mockScoreRepository.update.mockResolvedValue(null);

      // Act
      const result = await scoreService.updateScore('invalid-id', {
        score: 100,
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Score not found');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should log error for unexpected update exceptions', async () => {
      mockScoreRepository.update.mockRejectedValue(new Error('DB Error'));
      const result = await scoreService.updateScore(mockScoreId, {
        score: 100,
      });
      expect(result.isFailure).toBe(true);
      expect(logger.error).toHaveBeenCalled();
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
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should log error for unexpected delete exceptions', async () => {
      mockScoreRepository.delete.mockRejectedValue(new Error('DB Error'));
      const result = await scoreService.deleteScore(mockScoreId);
      expect(result.isFailure).toBe(true);
      expect(logger.error).toHaveBeenCalled();
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

    it('should handle repository error in getScoresByMatchId', async () => {
      mockScoreRepository.findByMatchId.mockRejectedValue(
        new Error('DB error'),
      );
      const result = await scoreService.getScoresByMatchId(mockMatchId);
      expect(result.isFailure).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getMatchScores', () => {
    it('should retrieve and format match scores', async () => {
      const matchScores = [
        { playerId: { username: 'user1' }, score: 10 },
        { playerId: { username: 'user2' }, score: 20 },
        { playerId: null, score: 5 }, // Unknown user
      ];
      mockScoreRepository.findByMatchId.mockResolvedValue(matchScores);

      const result = await scoreService.getMatchScores(mockMatchId);

      expect(result.isSuccess).toBe(true);
      expect(result.value.scores).toEqual({
        user1: 10,
        user2: 20,
        Unknown: 5,
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('should handle errors in getMatchScores', async () => {
      mockScoreRepository.findByMatchId.mockRejectedValue(
        new Error('DB error'),
      );
      const result = await scoreService.getMatchScores(mockMatchId);
      expect(result.isFailure).toBe(true);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  /**
   * Score Calculation Methods (Moved from game.logic.js)
   */
  describe('calculateCardPoints', () => {
    it('should calculate points for number cards (0-9)', () => {
      const testCases = [
        { card: { type: 'number', value: '0' }, expected: 0 },
        { card: { type: 'number', value: '5' }, expected: 5 },
        { card: { type: 'number', value: '9' }, expected: 9 },
      ];

      testCases.forEach(({ card, expected }) => {
        expect(scoreService.calculateCardPoints(card)).toBe(expected);
      });
    });

    it('should calculate 20 points for action cards', () => {
      const actionCards = [
        { type: 'action', value: 'skip' },
        { type: 'action', value: 'reverse' },
        { type: 'action', value: 'draw_two' },
      ];

      actionCards.forEach((card) => {
        expect(scoreService.calculateCardPoints(card)).toBe(20);
      });
    });

    it('should calculate 50 points for wild cards', () => {
      const wildCards = [
        { type: 'wild', value: 'wild' },
        { type: 'wild', value: 'wild_draw_four' },
      ];

      wildCards.forEach((card) => {
        expect(scoreService.calculateCardPoints(card)).toBe(50);
      });
    });

    it('should return 0 for unknown card types', () => {
      const unknownCard = { type: 'unknown', value: 'unknown' };
      expect(scoreService.calculateCardPoints(unknownCard)).toBe(0);
    });
  });

  describe('calculateHandScore', () => {
    it('should return 0 for empty hand', () => {
      expect(scoreService.calculateHandScore([])).toBe(0);
    });

    it('should return 0 for null or undefined hand', () => {
      expect(scoreService.calculateHandScore(null)).toBe(0);
      expect(scoreService.calculateHandScore(undefined)).toBe(0);
    });

    it('should calculate total score for a hand with number cards', () => {
      const hand = [
        { type: 'number', value: '3' },
        { type: 'number', value: '5' },
        { type: 'number', value: '7' },
      ];

      expect(scoreService.calculateHandScore(hand)).toBe(15); // 3 + 5 + 7
    });

    it('should calculate total score for a hand with action cards', () => {
      const hand = [
        { type: 'action', value: 'skip' },
        { type: 'action', value: 'reverse' },
      ];

      expect(scoreService.calculateHandScore(hand)).toBe(40); // 20 + 20
    });

    it('should calculate total score for a mixed hand', () => {
      const hand = [
        { type: 'number', value: '5' }, // 5
        { type: 'number', value: '7' }, // 7
        { type: 'action', value: 'skip' }, // 20
        { type: 'wild', value: 'wild' }, // 50
      ];

      expect(scoreService.calculateHandScore(hand)).toBe(82); // 5 + 7 + 20 + 50
    });

    it('should calculate total score for a hand with all wild cards', () => {
      const hand = [
        { type: 'wild', value: 'wild' },
        { type: 'wild', value: 'wild_draw_four' },
      ];

      expect(scoreService.calculateHandScore(hand)).toBe(100); // 50 + 50
    });
  });

  describe('calculateFinalScore', () => {
    it('should return 0 if game is null or undefined', () => {
      expect(scoreService.calculateFinalScore(null, 'winner123')).toBe(0);
      expect(scoreService.calculateFinalScore(undefined, 'winner123')).toBe(0);
    });

    it('should return 0 if game has no players', () => {
      const game = { players: [] };
      expect(scoreService.calculateFinalScore(game, 'winner123')).toBe(0);
    });

    it('should return 0 if winnerId is not provided', () => {
      const game = {
        players: [{ _id: 'player1', hand: [{ type: 'number', value: '5' }] }],
      };
      expect(scoreService.calculateFinalScore(game, null)).toBe(0);
    });

    it('should calculate score from one opponent', () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [], // Winner has no cards
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [
              { type: 'number', value: '5' },
              { type: 'number', value: '7' },
            ],
          },
        ],
      };

      expect(scoreService.calculateFinalScore(game, 'winner123')).toBe(12); // 5 + 7
    });

    it('should calculate score from multiple opponents', () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [], // Winner
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [
              { type: 'number', value: '5' }, // 5
              { type: 'action', value: 'skip' }, // 20
            ],
          },
          {
            _id: { toString: () => 'loser2' },
            hand: [
              { type: 'wild', value: 'wild' }, // 50
              { type: 'number', value: '3' }, // 3
            ],
          },
        ],
      };

      expect(scoreService.calculateFinalScore(game, 'winner123')).toBe(78); // 25 + 53
    });

    it('should skip the winner when calculating score', () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [{ type: 'number', value: '9' }], // Should be skipped
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [{ type: 'number', value: '5' }],
          },
        ],
      };

      expect(scoreService.calculateFinalScore(game, 'winner123')).toBe(5);
    });

    it('should handle players with empty hands', () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [],
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [],
          },
          {
            _id: { toString: () => 'loser2' },
            hand: [{ type: 'number', value: '7' }],
          },
        ],
      };

      expect(scoreService.calculateFinalScore(game, 'winner123')).toBe(7);
    });

    it('should handle complex game scenario', () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [],
          },
          {
            _id: { toString: () => 'player2' },
            hand: [
              { type: 'number', value: '5' }, // 5
              { type: 'number', value: '7' }, // 7
              { type: 'action', value: 'skip' }, // 20
            ],
          },
          {
            _id: { toString: () => 'player3' },
            hand: [
              { type: 'wild', value: 'wild_draw_four' }, // 50
              { type: 'action', value: 'reverse' }, // 20
              { type: 'number', value: '2' }, // 2
            ],
          },
        ],
      };

      expect(scoreService.calculateFinalScore(game, 'winner123')).toBe(104); // 32 + 72
    });
  });

  describe('calculateAndCreateScore', () => {
    it('should calculate score and create score entry', async () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [],
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [
              { type: 'number', value: '5' },
              { type: 'action', value: 'skip' },
            ],
          },
        ],
      };

      const mockCreatedScore = {
        _id: 'score123',
        playerId: 'winner123',
        matchId: 'game456',
        score: 25,
        createdAt: new Date(),
      };

      mockScoreRepository.create.mockResolvedValue(mockCreatedScore);

      const result = await scoreService.calculateAndCreateScore(
        game,
        'winner123',
        'game456',
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockCreatedScore);

      // Verify repository was called with correct data
      expect(mockScoreRepository.create).toHaveBeenCalledWith({
        playerId: 'winner123',
        matchId: 'game456',
        score: 25,
      });

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Calculating final score'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('scored 25 points'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Score saved successfully'),
      );
    });

    it('should handle repository failure', async () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [],
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [{ type: 'number', value: '5' }],
          },
        ],
      };

      mockScoreRepository.create.mockResolvedValue(null);

      const result = await scoreService.calculateAndCreateScore(
        game,
        'winner123',
        'game456',
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toContain('repository returned null');

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to calculate/save score'),
      );
    });

    it('should handle repository exception', async () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [],
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [{ type: 'number', value: '5' }],
          },
        ],
      };

      const dbError = new Error('Database connection failed');
      mockScoreRepository.create.mockRejectedValue(dbError);

      const result = await scoreService.calculateAndCreateScore(
        game,
        'winner123',
        'game456',
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('Database connection failed');

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to calculate/save score'),
      );
    });

    it('should calculate score of 0 when all opponents have empty hands', async () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [],
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [],
          },
        ],
      };

      const mockCreatedScore = {
        _id: 'score123',
        playerId: 'winner123',
        matchId: 'game456',
        score: 0,
      };

      mockScoreRepository.create.mockResolvedValue(mockCreatedScore);

      const result = await scoreService.calculateAndCreateScore(
        game,
        'winner123',
        'game456',
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value.score).toBe(0);

      expect(mockScoreRepository.create).toHaveBeenCalledWith({
        playerId: 'winner123',
        matchId: 'game456',
        score: 0,
      });
    });

    it('should handle high score values correctly', async () => {
      const game = {
        players: [
          {
            _id: { toString: () => 'winner123' },
            hand: [],
          },
          {
            _id: { toString: () => 'loser1' },
            hand: [
              { type: 'wild', value: 'wild' }, // 50
              { type: 'wild', value: 'wild_draw_four' }, // 50
              { type: 'action', value: 'skip' }, // 20
              { type: 'action', value: 'reverse' }, // 20
              { type: 'number', value: '9' }, // 9
            ],
          },
        ],
      };

      const mockCreatedScore = {
        _id: 'score123',
        playerId: 'winner123',
        matchId: 'game456',
        score: 149,
      };

      mockScoreRepository.create.mockResolvedValue(mockCreatedScore);

      const result = await scoreService.calculateAndCreateScore(
        game,
        'winner123',
        'game456',
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value.score).toBe(149);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('scored 149 points'),
      );
    });
  });
});
