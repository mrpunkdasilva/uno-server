jest.mock('../../../../src/infra/repositories/game.repository.js');
jest.mock('../../../../src/presentation/dtos/gameResponse.dto.js');
jest.mock('../../../../src/presentation/dtos/updateGame.dto.js');

import GameService from '../../../../src/core/services/game.service.js';
import GameRepository from '../../../../src/infra/repositories/game.repository.js';
import gameResponseDtoSchema from '../../../../src/presentation/dtos/gameResponse.dto.js';
import updateGameDtoSchema from '../../../../src/presentation/dtos/updateGame.dto.js';
import { ZodError } from 'zod';
import { mockGame, mockParsedGame } from '../../../../src/mocks/game.mocks.js';

describe('GameService', () => {
  let gameService;
  let mockGameRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGameRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      createGame: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
      findGameStatus: jest.fn(),
    };

    GameRepository.mockImplementation(() => mockGameRepository);
    gameService = new GameService();

    gameResponseDtoSchema.parse.mockReturnValue(mockParsedGame);
    updateGameDtoSchema.parse.mockImplementation((data) => data);
  });

  describe('Constructor', () => {
    it('should initialize with GameRepository instance', () => {
      expect(GameRepository).toHaveBeenCalledTimes(1);
      expect(gameService.gameRepository).toBe(mockGameRepository);
    });
  });

  describe('getAllGames', () => {
    it('should return all games formatted as DTO', async () => {
      const mockGames = [mockGame, { ...mockGame, _id: '456' }];
      mockGameRepository.findAll.mockResolvedValue(mockGames);
      const result = await gameService.getAllGames();

      expect(mockGameRepository.findAll).toHaveBeenCalledTimes(1);
      expect(gameResponseDtoSchema.parse).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockParsedGame);
    });

    it('should propagate repository error', async () => {
      const mockError = new Error('Database error');
      mockGameRepository.findAll.mockRejectedValue(mockError);
      await expect(gameService.getAllGames()).rejects.toThrow('Database error');
    });
  });

  describe('getGameById', () => {
    it('should return specific game when found', async () => {
      const gameId = '123';
      mockGameRepository.findById.mockResolvedValue(mockGame);

      const result = await gameService.getGameById(gameId);
      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameResponseDtoSchema.parse).toHaveBeenCalledWith(mockGame);
      expect(result).toEqual(mockParsedGame);
    });

    it('should throw Game not found error', async () => {
      mockGameRepository.findById.mockResolvedValue(null);
      await expect(gameService.getGameById('invalid')).rejects.toThrow(
        'Game not found',
      );
    });
  });

  describe('createGame', () => {
    const mockGameData = {
      name: 'New Game',
      rules: 'Some default rules for the test game.',
      maxPlayers: 4,
    };
    const mockUserId = 'user123';

    it('should create game with valid data', async () => {
      const createdGame = {
        _id: { toString: () => 'new-game-id' },
        title: mockGameData.name,
        rules: mockGameData.rules,
        status: 'Waiting',
        maxPlayers: mockGameData.maxPlayers,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGameRepository.createGame.mockResolvedValue(createdGame);
      const result = await gameService.createGame(mockGameData, mockUserId);

      expect(mockGameRepository.createGame).toHaveBeenCalledWith({
        title: mockGameData.name,
        rules: mockGameData.rules,
        maxPlayers: mockGameData.maxPlayers,
        creatorId: mockUserId,
        players: [
          {
            _id: mockUserId,
            ready: true,
            position: 1,
          },
        ],
      });

      expect(gameResponseDtoSchema.parse).toHaveBeenCalledWith({
        id: createdGame._id.toString(),
        title: createdGame.title,
        rules: createdGame.rules,
        status: createdGame.status,
        maxPlayers: createdGame.maxPlayers,
        createdAt: createdGame.createdAt,
        updatedAt: createdGame.updatedAt,
      });

      expect(result).toEqual(mockParsedGame);
    });

    it('should propagate creation error', async () => {
      const mockError = new Error('Validation failed');
      mockGameRepository.createGame.mockRejectedValue(mockError);
      await expect(
        gameService.createGame(mockGameData, mockUserId),
      ).rejects.toThrow('Validation failed');
    });

    it('should throw ZodError when name is missing', async () => {
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            name: undefined,
          },
          mockUserId,
        ),
      ).rejects.toThrow(ZodError);
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            name: undefined,
          },
          mockUserId,
        ),
      ).rejects.toHaveProperty('issues.0.path.0', 'name');
    });

    it('should throw ZodError when name is too short', async () => {
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            name: 'ab',
          },
          mockUserId,
        ),
      ).rejects.toThrow(ZodError);
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            name: 'ab',
          },
          mockUserId,
        ),
      ).rejects.toHaveProperty('issues.0.path.0', 'name');
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            name: 'ab',
          },
          mockUserId,
        ),
      ).rejects.toHaveProperty(
        'issues.0.message',
        'Game must have at least 3 letters as name (ex: UNO)',
      );
    });

    it('should throw ZodError when rules is missing', async () => {
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            rules: undefined,
          },
          mockUserId,
        ),
      ).rejects.toThrow(ZodError);
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            rules: undefined,
          },
          mockUserId,
        ),
      ).rejects.toHaveProperty('issues.0.path.0', 'rules');
    });

    it('should throw ZodError when rules is too short', async () => {
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            rules: 'short',
          },
          mockUserId,
        ),
      ).rejects.toThrow(ZodError);
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            rules: 'short',
          },
          mockUserId,
        ),
      ).rejects.toHaveProperty('issues.0.path.0', 'rules');
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            rules: 'short',
          },
          mockUserId,
        ),
      ).rejects.toHaveProperty(
        'issues.0.message',
        'Rules must have at least 10 characters',
      );
    });

    it('should throw ZodError when maxPlayers is too low', async () => {
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            maxPlayers: 1,
          },
          mockUserId,
        ),
      ).rejects.toThrow(ZodError);
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            maxPlayers: 1,
          },
          mockUserId,
        ),
      ).rejects.toHaveProperty('issues.0.path.0', 'maxPlayers');
      await expect(
        gameService.createGame(
          {
            ...mockGameData,
            maxPlayers: 1,
          },
          mockUserId,
        ),
      ).rejects.toHaveProperty(
        'issues.0.message',
        'The game must have at least 2 players',
      );
    });
  });

  describe('updateGame', () => {
    const gameId = '123';
    const updateData = { title: 'Updated Title', status: 'Active' };

    it('should update existing game', async () => {
      const updatedGame = {
        ...mockGame,
        title: 'Updated Title',
        status: 'Active',
      };
      updateGameDtoSchema.parse.mockReturnValue(updateData);
      mockGameRepository.update.mockResolvedValue(updatedGame);

      const result = await gameService.updateGame(gameId, updateData);

      expect(updateGameDtoSchema.parse).toHaveBeenCalledWith(updateData);
      expect(mockGameRepository.update).toHaveBeenCalledWith(
        gameId,
        updateData,
      );
      expect(gameResponseDtoSchema.parse).toHaveBeenCalled();
      expect(result).toEqual(mockParsedGame);
    });

    it('should throw Game not found error', async () => {
      updateGameDtoSchema.parse.mockReturnValue(updateData);
      mockGameRepository.update.mockResolvedValue(null);
      await expect(gameService.updateGame(gameId, updateData)).rejects.toThrow(
        'Game not found',
      );
    });

    it('should validate input data with schema', async () => {
      const invalidData = { invalidField: 'value' };
      const validationError = new Error('Validation error');
      updateGameDtoSchema.parse.mockImplementation(() => {
        throw validationError;
      });
      await expect(gameService.updateGame(gameId, invalidData)).rejects.toThrow(
        'Validation error',
      );
    });
  });

  describe('deleteGame', () => {
    const gameId = '123';

    it('should delete existing game', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      mockGameRepository.delete.mockResolvedValue(mockGame);

      const result = await gameService.deleteGame(gameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.delete).toHaveBeenCalledWith(gameId);
      expect(result).toEqual(mockGame);
    });

    it('should throw Game not found error before deletion', async () => {
      mockGameRepository.findById.mockResolvedValue(null);
      await expect(gameService.deleteGame(gameId)).rejects.toThrow(
        'Game not found',
      );
      expect(mockGameRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('joinGame', () => {
    const userId = 'newPlayer123';
    const gameId = 'game123';

    beforeEach(() => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        players: [
          {
            _id: 'creator123',
            ready: true,
            position: 1,
          },
        ],
      });
      mockGameRepository.save.mockResolvedValue({});
    });

    it('should allow user to join game', async () => {
      const result = await gameService.joinGame(userId, gameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'User joined the game successfully',
        gameId: mockGame._id,
        currentPlayerCount: 2,
      });
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);
      await expect(gameService.joinGame(userId, gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('should throw error when game is not Waiting', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        status: 'Active',
      });
      await expect(gameService.joinGame(userId, gameId)).rejects.toThrow(
        'Game is not accepting new players (Already Active or Ended)',
      );
    });

    it('should throw error when game is full', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        maxPlayers: 1,
        players: [
          {
            _id: 'creator123',
            ready: true,
            position: 1,
          },
        ],
      });
      await expect(gameService.joinGame(userId, gameId)).rejects.toThrow(
        'Game is full',
      );
    });

    it('should throw error when user already in game', async () => {
      const existingUserId = 'creator123';
      await expect(
        gameService.joinGame(existingUserId, gameId),
      ).rejects.toThrow('User is already in this game');
    });
  });

  describe('setPlayerReady', () => {
    const userId = 'player123';
    const gameId = 'game123';

    beforeEach(() => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        players: [
          { _id: userId, ready: false, position: 0 },
          { _id: 'player456', ready: true, position: 0 },
        ],
      });
      mockGameRepository.save.mockResolvedValue({});
    });

    it('should mark player as ready', async () => {
      const result = await gameService.setPlayerReady(userId, gameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Player set to ready',
        playersReadyCount: 2,
        totalPlayers: 2,
      });
    });

    it('should return Already ready when player already ready', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        players: [{ _id: userId, ready: true, position: 0 }],
      });

      const result = await gameService.setPlayerReady(userId, gameId);

      expect(result).toEqual({
        success: true,
        message: 'Already ready',
        playersReadyCount: 1,
        totalPlayers: 1,
      });
      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);
      await expect(gameService.setPlayerReady(userId, gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('should throw error when game not Waiting', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        status: 'Active',
      });
      await expect(gameService.setPlayerReady(userId, gameId)).rejects.toThrow(
        'Cannot ready now',
      );
    });

    it('should throw error when player not in game', async () => {
      const nonPlayerId = 'nonPlayer123';
      await expect(
        gameService.setPlayerReady(nonPlayerId, gameId),
      ).rejects.toThrow('You are not in this game');
    });
  });

  describe('startGame', () => {
    const creatorId = 'creator123';
    const gameId = 'game123';

    const gameWithAllReady = {
      ...mockGame,
      creatorId: creatorId,
      players: [
        { _id: 'player1', ready: true, position: 0 },
        { _id: 'player2', ready: true, position: 0 },
        { _id: 'player3', ready: true, position: 0 },
      ],
      minPlayers: 2,
    };

    beforeEach(() => {
      mockGameRepository.findById.mockResolvedValue(gameWithAllReady);
      mockGameRepository.save.mockResolvedValue({});
    });

    it('should start game when all conditions met', async () => {
      const result = await gameService.startGame(creatorId, gameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(gameResponseDtoSchema.parse).toHaveBeenCalled();
      expect(result).toEqual(mockParsedGame);
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);
      await expect(gameService.startGame(creatorId, gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('should throw error when user is not creator', async () => {
      const nonCreatorId = 'nonCreator123';
      await expect(gameService.startGame(nonCreatorId, gameId)).rejects.toThrow(
        'Only the game creator can start the game',
      );
    });

    it('should throw error when game already started', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...gameWithAllReady,
        status: 'Active',
      });
      await expect(gameService.startGame(creatorId, gameId)).rejects.toThrow(
        'Game has already started',
      );
    });

    it('should throw error when insufficient players', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...gameWithAllReady,
        players: [{ _id: 'player1', ready: true, position: 0 }],
        minPlayers: 3,
        status: 'Waiting',
      });
      await expect(gameService.startGame(creatorId, gameId)).rejects.toThrow(
        'Minimum 3 players required to start',
      );
    });
  });

  describe('abandonGame', () => {
    const userId = 'player123';
    const gameId = 'game123';

    const activeGame = {
      ...mockGame,
      status: 'Active',
      players: [
        { _id: userId, ready: true, position: 1 },
        { _id: 'player456', ready: true, position: 2 },
        { _id: 'player789', ready: true, position: 3 },
      ],
    };

    beforeEach(() => {
      mockGameRepository.findById.mockResolvedValue(activeGame);
      mockGameRepository.save.mockResolvedValue({});
    });

    it('should allow player to abandon active game', async () => {
      const result = await gameService.abandonGame(userId, gameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'You left the game' });
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);
      await expect(gameService.abandonGame(userId, gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('should throw error when player not in game', async () => {
      const nonPlayerId = 'nonPlayer123';
      await expect(
        gameService.abandonGame(nonPlayerId, gameId),
      ).rejects.toThrow('You are not in this game');
    });

    it('should end game when only one player remains', async () => {
      const twoPlayerGame = {
        ...activeGame,
        players: [
          { _id: userId, ready: true, position: 1 },
          { _id: 'player456', ready: true, position: 2 },
        ],
      };

      mockGameRepository.findById.mockResolvedValue(twoPlayerGame);
      await gameService.abandonGame(userId, gameId);

      const savedGame = mockGameRepository.save.mock.calls[0][0];
      expect(savedGame.status).toBe('Ended');
      expect(savedGame.winnerId).toBe('player456');
      expect(savedGame.players).toHaveLength(1);
    });
  });

  describe('getGameStatus', () => {
    const gameId = 'game123';

    it('should return game status', async () => {
      mockGameRepository.findGameStatus.mockResolvedValue({
        _id: gameId,
        status: 'Active',
      });
      const result = await gameService.getGameStatus(gameId);
      expect(mockGameRepository.findGameStatus).toHaveBeenCalledWith(gameId);
      expect(result).toBe('Active');
    });

    it('should throw error for invalid ID', async () => {
      const invalidIds = ['', null, undefined, 123, {}];
      for (const invalidId of invalidIds) {
        await expect(gameService.getGameStatus(invalidId)).rejects.toThrow(
          'Invalid game ID',
        );
      }
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findGameStatus.mockResolvedValue(null);
      await expect(gameService.getGameStatus(gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('should return different possible statuses', async () => {
      const statuses = ['Waiting', 'Active', 'Paused', 'Ended'];
      for (const status of statuses) {
        mockGameRepository.findGameStatus.mockResolvedValue({
          _id: gameId,
          status,
        });
        const result = await gameService.getGameStatus(gameId);
        expect(result).toBe(status);
      }
    });

    it('should trim ID before querying', async () => {
      const gameIdWithSpaces = '   game123  ';
      mockGameRepository.findGameStatus.mockResolvedValue({
        _id: 'game123',
        status: 'Waiting',
      });
      const result = await gameService.getGameStatus(gameIdWithSpaces);
      expect(mockGameRepository.findGameStatus).toHaveBeenCalledWith('game123');
      expect(result).toBe('Waiting');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ID strings', async () => {
      await expect(gameService.getGameById('')).rejects.toThrow(
        'Game not found',
      );
    });

    it('should handle undefined IDs', async () => {
      await expect(gameService.getGameById(undefined)).rejects.toThrow(
        'Game not found',
      );
    });

    it('should maintain input object immutability', async () => {
      const originalGameData = {
        name: 'Original',
        rules: 'Original rules',
        maxPlayers: 4,
      };
      const gameDataCopy = { ...originalGameData };
      const createdGameMock = {
        ...mockGame,
        _id: 'immutable-game-id',
        title: originalGameData.name,
        rules: originalGameData.rules,
      };

      mockGameRepository.createGame.mockResolvedValue(createdGameMock);
      await gameService.createGame(originalGameData, 'user123');
      expect(originalGameData).toEqual(gameDataCopy);
    });

    it('should convert ObjectId to string in DTO', async () => {
      const gameId = '123';
      const gameWithObjectId = { ...mockGame, _id: { toString: () => '123' } };

      mockGameRepository.findById.mockResolvedValue(gameWithObjectId);
      gameResponseDtoSchema.parse.mockReturnValue({
        ...mockParsedGame,
        id: '123',
      });

      const result = await gameService.getGameById(gameId);
      expect(result.id).toBe('123');
    });
  });
});
