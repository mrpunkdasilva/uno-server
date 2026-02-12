jest.mock('../../../../src/infra/repositories/game.repository.js');
jest.mock('../../../../src/infra/repositories/player.repository.js');
jest.mock('../../../../src/presentation/dtos/game/game-response.dto.js');
jest.mock('../../../../src/presentation/dtos/game/update-game.dto.js');
jest.mock('../../../../src/presentation/dtos/game/create-game.dto.js');
jest.mock('../../../../src/config/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import GameService from '../../../../src/core/services/game/game.service.js';
import GameRepository from '../../../../src/infra/repositories/game.repository.js';
import logger from '../../../../src/config/logger.js';
import mongoose from 'mongoose';

describe('GameService Game Ending Logic', () => {
  let gameService;
  let mockGameRepository;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGameRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      getPlayerHandSize: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    GameRepository.mockImplementation(() => mockGameRepository);
    logger.info = mockLogger.info;
    logger.warn = mockLogger.warn;
    logger.error = mockLogger.error;

    const mockPlayerRepository = {};
    gameService = new GameService(mockGameRepository, mockPlayerRepository);
  });

  describe('checkAndEndGameIfPlayerWins', () => {
    it('should end the game and set the player as winner if hand size is 0', async () => {
      const gameId = 'game123';
      const playerId = 'player1';

      mockGameRepository.getPlayerHandSize.mockResolvedValue(0);
      mockGameRepository.update.mockResolvedValue({});

      const result = await gameService.checkAndEndGameIfPlayerWins(
        gameId,
        playerId,
      );

      expect(mockGameRepository.getPlayerHandSize).toHaveBeenCalledWith(
        gameId,
        playerId,
      );
      expect(mockGameRepository.update).toHaveBeenCalledWith(
        gameId,
        expect.objectContaining({
          status: 'Ended',
          winnerId: playerId,
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Player ${playerId} has won game ${gameId}. Ending game.`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Attempting to end game ${gameId} with winner ${playerId}.`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game ${gameId} successfully ended. Winner: ${playerId}.`,
      );
      expect(result).toBe(true);
    });

    it('should not end the game if hand size is not 0', async () => {
      const gameId = 'game123';
      const playerId = 'player1';

      mockGameRepository.getPlayerHandSize.mockResolvedValue(1);

      const result = await gameService.checkAndEndGameIfPlayerWins(
        gameId,
        playerId,
      );

      expect(mockGameRepository.getPlayerHandSize).toHaveBeenCalledWith(
        gameId,
        playerId,
      );
      expect(mockGameRepository.update).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should throw an error if gameRepository.getPlayerHandSize fails', async () => {
      const gameId = 'game123';
      const playerId = 'player1';
      const mockError = new Error('Database read error');

      mockGameRepository.getPlayerHandSize.mockRejectedValue(mockError);

      await expect(
        gameService.checkAndEndGameIfPlayerWins(gameId, playerId),
      ).rejects.toThrow(mockError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error checking for game end for player ${playerId} in game ${gameId}: ${mockError.message}`,
      );
    });
  });

  describe('abandonGame game ending scenarios', () => {
    it('should end the game with the last player as winner when one player abandons and one remains', async () => {
      const gameId = 'game123';
      const abandoningPlayerId = 'player1';
      const lastPlayerId = new mongoose.Types.ObjectId().toString();

      const game = {
        _id: gameId,
        status: 'Active',
        players: [
          { _id: abandoningPlayerId, ready: true, position: 1 },
          { _id: lastPlayerId, ready: true, position: 2 },
        ],
        creatorId: abandoningPlayerId,
        save: mockGameRepository.save,
      };

      mockGameRepository.findById.mockResolvedValue(game);
      mockGameRepository.update.mockResolvedValue({});

      await gameService.abandonGame(abandoningPlayerId, gameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.update).toHaveBeenCalledWith(
        gameId,
        expect.objectContaining({
          status: 'Ended',
          winnerId: lastPlayerId,
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game ${gameId} ended due to last player (${lastPlayerId}) remaining after abandonment.`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game ${gameId} successfully ended. Winner: ${lastPlayerId}.`,
      );
    });

    it('should end the game without a winner when all players abandon', async () => {
      const gameId = 'game123';
      const abandoningPlayerId = 'player1';

      const game = {
        _id: gameId,
        status: 'Active',
        players: [{ _id: abandoningPlayerId, ready: true, position: 1 }],
        creatorId: abandoningPlayerId,
        save: mockGameRepository.save,
      };

      mockGameRepository.findById.mockResolvedValue(game);
      mockGameRepository.update.mockResolvedValue({});

      await gameService.abandonGame(abandoningPlayerId, gameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.update).toHaveBeenCalledWith(
        gameId,
        expect.objectContaining({
          status: 'Ended',
          winnerId: null,
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game ${gameId} ended as all players abandoned.`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game ${gameId} successfully ended. Winner: No specific winner.`,
      );
    });

    it('should not end the game if more than one player remains after abandonment', async () => {
      const gameId = 'game123';
      const abandoningPlayerId = 'player1';
      const remainingPlayer1 = new mongoose.Types.ObjectId().toString();
      const remainingPlayer2 = new mongoose.Types.ObjectId().toString();

      const game = {
        _id: gameId,
        status: 'Active',
        players: [
          { _id: abandoningPlayerId, ready: true, position: 1 },
          { _id: remainingPlayer1, ready: true, position: 2 },
          { _id: remainingPlayer2, ready: true, position: 3 },
        ],
        creatorId: abandoningPlayerId,
        save: mockGameRepository.save,
      };

      mockGameRepository.findById.mockResolvedValue(game);
      mockGameRepository.save.mockResolvedValue({});

      await gameService.abandonGame(abandoningPlayerId, gameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.update).not.toHaveBeenCalled();
      expect(mockGameRepository.save).toHaveBeenCalledTimes(1);
      expect(game.players).toHaveLength(2);
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('ended'),
      );
    });

    it('should throw an error if abandoning a game that is not active', async () => {
      const gameId = 'game123';
      const playerId = 'player1';
      const game = {
        _id: gameId,
        status: 'Waiting',
        players: [{ _id: playerId, ready: true, position: 1 }],
        creatorId: playerId,
      };

      mockGameRepository.findById.mockResolvedValue(game);

      await expect(gameService.abandonGame(playerId, gameId)).rejects.toThrow(
        'Cannot abandon now',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Abandon game failed for user ${playerId} in game ${gameId}: Game not in 'Active' status.`,
      );
      expect(mockGameRepository.update).not.toHaveBeenCalled();
    });

    it('should throw an error if abandoning a game that is already ended', async () => {
      const gameId = 'game123';
      const playerId = 'player1';
      const game = {
        _id: gameId,
        status: 'Ended',
        players: [{ _id: playerId, ready: true, position: 1 }],
        creatorId: playerId,
      };

      mockGameRepository.findById.mockResolvedValue(game);

      await expect(gameService.abandonGame(playerId, gameId)).rejects.toThrow(
        'Cannot abandon now',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Abandon game failed for user ${playerId} in game ${gameId}: Game not in 'Active' status.`,
      );
      expect(mockGameRepository.update).not.toHaveBeenCalled();
    });
  });
});
