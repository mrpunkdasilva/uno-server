jest.mock('../../../../src/infra/repositories/game.repository.js');
jest.mock('../../../../src/infra/repositories/player.repository.js');
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
import createGameDtoSchema from '../../../../src/presentation/dtos/game/create-game.dto.js';
import gameResponseDtoSchema from '../../../../src/presentation/dtos/game/game-response.dto.js';

describe('GameService Current Player and Turn Logic', () => {
  let gameService;
  let mockGameRepository;
  let mockLogger;

  const mockGameId = new mongoose.Types.ObjectId().toString();
  const mockPlayer1Id = new mongoose.Types.ObjectId().toString();
  const mockPlayer2Id = new mongoose.Types.ObjectId().toString();
  const mockPlayer3Id = new mongoose.Types.ObjectId().toString();

  const mockGameActive = (
    currentPlayerIndex = 0,
    turnDirection = 1,
    players = [
      { _id: mockPlayer1Id, position: 1 },
      { _id: mockPlayer2Id, position: 2 },
      { _id: mockPlayer3Id, position: 3 },
    ],
    status = 'Active',
    creatorIdMock = mockPlayer1Id,
  ) => ({
    _id: mockGameId,
    status: status,
    players: players,
    currentPlayerIndex: currentPlayerIndex,
    turnDirection: turnDirection,
    creatorId: { toString: () => creatorIdMock },
    save: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockGameRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
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

    createGameDtoSchema.parse = jest.fn().mockImplementation((data) => data);
    gameResponseDtoSchema.parse = jest.fn().mockImplementation((data) => data);

    const mockPlayerRepository = {};
    gameService = new GameService(mockGameRepository, mockPlayerRepository);
  });

  describe('startGame initialisation', () => {
    it('should initialize currentPlayerIndex to 0 and turnDirection to 1 when starting a game', async () => {
      const gameId = mockGameId;
      const creatorId = mockPlayer1Id;
      const playersInGame = [
        { _id: creatorId, ready: true, position: 1 },
        { _id: mockPlayer2Id, ready: true, position: 2 },
      ];
      const game = mockGameActive(0, 1, playersInGame, 'Waiting', creatorId);
      game.minPlayers = 2;
      game.maxPlayers = 2;

      mockGameRepository.findById.mockResolvedValue(game);
      mockGameRepository.save.mockResolvedValue(game);

      await gameService.startGame(creatorId, gameId);

      expect(game.status).toBe('Active');
      expect(game.currentPlayerIndex).toBe(0);
      expect(game.turnDirection).toBe(1);
      expect(mockGameRepository.save).toHaveBeenCalledWith(game);
    });
  });

  describe('getCurrentPlayer', () => {
    it('should return the ID of the current player', async () => {
      const game = mockGameActive();
      mockGameRepository.findById.mockResolvedValue(game);

      const currentPlayerId = await gameService.getCurrentPlayer(mockGameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(mockGameId);
      expect(currentPlayerId).toBe(mockPlayer1Id);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Attempting to retrieve current player for game ID: ${mockGameId}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully retrieved current player ${mockPlayer1Id} for game ${mockGameId}.`,
      );
    });

    it('should return the correct player after currentPlayerIndex changes', async () => {
      const game = mockGameActive(1);
      mockGameRepository.findById.mockResolvedValue(game);

      const currentPlayerId = await gameService.getCurrentPlayer(mockGameId);

      expect(currentPlayerId).toBe(mockPlayer2Id);
    });

    it('should throw an error if the game is not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(gameService.getCurrentPlayer(mockGameId)).rejects.toThrow(
        'Game not found',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Current player retrieval failed: Game ${mockGameId} not found.`,
      );
    });

    it('should throw an error if the game is not active', async () => {
      const game = mockGameActive(0, 1, [], 'Waiting');
      mockGameRepository.findById.mockResolvedValue(game);

      await expect(gameService.getCurrentPlayer(mockGameId)).rejects.toThrow(
        'Game is not active',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Current player retrieval failed for game ${mockGameId}: Game is not active.`,
      );
    });

    it('should throw an error if there are no players in the game', async () => {
      const game = mockGameActive(0, 1, []);
      mockGameRepository.findById.mockResolvedValue(game);

      await expect(gameService.getCurrentPlayer(mockGameId)).rejects.toThrow(
        'No players in game',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Current player retrieval failed for game ${mockGameId}: No players in the game.`,
      );
    });

    it('should throw an error if currentPlayerIndex is out of bounds', async () => {
      const game = mockGameActive(999);
      mockGameRepository.findById.mockResolvedValue(game);

      await expect(gameService.getCurrentPlayer(mockGameId)).rejects.toThrow(
        'Could not determine current player',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Current player retrieval failed for game ${mockGameId}: Invalid currentPlayerIndex.`,
      );
    });
  });

  describe('advanceTurn', () => {
    it('should advance the turn clockwise', async () => {
      const game = mockGameActive(0, 1);
      mockGameRepository.findById.mockResolvedValue(game);
      mockGameRepository.save.mockResolvedValue(game);

      const nextPlayerId = await gameService.advanceTurn(mockGameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(mockGameId);
      expect(game.currentPlayerIndex).toBe(1);
      expect(nextPlayerId).toBe(mockPlayer2Id);
      expect(mockGameRepository.save).toHaveBeenCalledWith(game);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Turn advanced for game ${mockGameId}. Next player: ${mockPlayer2Id}.`,
      );
    });

    it('should advance the turn counter-clockwise', async () => {
      const game = mockGameActive(1, -1);
      mockGameRepository.findById.mockResolvedValue(game);
      mockGameRepository.save.mockResolvedValue(game);

      const nextPlayerId = await gameService.advanceTurn(mockGameId);

      expect(game.currentPlayerIndex).toBe(0);
      expect(nextPlayerId).toBe(mockPlayer1Id);
    });

    it('should wrap around to the first player in clockwise direction', async () => {
      const game = mockGameActive(2, 1);
      mockGameRepository.findById.mockResolvedValue(game);
      mockGameRepository.save.mockResolvedValue(game);

      const nextPlayerId = await gameService.advanceTurn(mockGameId);

      expect(game.currentPlayerIndex).toBe(0);
      expect(nextPlayerId).toBe(mockPlayer1Id);
    });

    it('should wrap around to the last player in counter-clockwise direction', async () => {
      const game = mockGameActive(0, -1);
      mockGameRepository.findById.mockResolvedValue(game);
      mockGameRepository.save.mockResolvedValue(game);

      const nextPlayerId = await gameService.advanceTurn(mockGameId);

      expect(game.currentPlayerIndex).toBe(2);
      expect(nextPlayerId).toBe(mockPlayer3Id);
    });

    it('should throw an error if the game is not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(gameService.advanceTurn(mockGameId)).rejects.toThrow(
        'Game not found',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Advance turn failed: Game ${mockGameId} not found.`,
      );
    });

    it('should throw an error if the game is not active', async () => {
      const game = mockGameActive(0, 1, [], 'Waiting');
      mockGameRepository.findById.mockResolvedValue(game);

      await expect(gameService.advanceTurn(mockGameId)).rejects.toThrow(
        'Game is not active',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Advance turn failed for game ${mockGameId}: Game is not active.`,
      );
    });

    it('should throw an error if there are no players in the game', async () => {
      const game = mockGameActive(0, 1, []);
      mockGameRepository.findById.mockResolvedValue(game);

      await expect(gameService.advanceTurn(mockGameId)).rejects.toThrow(
        'No players in game',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Advance turn failed for game ${mockGameId}: No players in the game.`,
      );
    });
  });
});
