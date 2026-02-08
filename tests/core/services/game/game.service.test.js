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
import GameService from '../../../../src/core/services/game.service.js';
import GameRepository from '../../../../src/infra/repositories/game.repository.js';
import PlayerRepository from '../../../../src/infra/repositories/player.repository.js';
import gameResponseDtoSchema from '../../../../src/presentation/dtos/game/game-response.dto.js';
import updateGameDtoSchema from '../../../../src/presentation/dtos/game/update-game.dto.js';
import createGameDtoSchema from '../../../../src/presentation/dtos/game/create-game.dto.js';
import logger from '../../../../src/config/logger.js';

// Importar todos os mocks do arquivo centralizado
import {
  mockGame,
  mockParsedGame,
  mockGameId,
  mockPlayerId1,
  mockPlayerId2,
  mockGameData,
  mockPlayer1,
  mockPlayer2,
  mockCreateGameData,
  mockUserId,
  mockGameIdForUpdate,
  mockUpdateData,
  mockGameIdForDelete,
  mockJoinGameUserId,
  mockJoinGameId,
  mockReadyUserId,
  mockReadyGameId,
  mockCreatorId,
  mockStartGameId,
  mockGameWithAllReady,
  mockAbandonUserId,
  mockAbandonGameId,
  mockActiveGame,
  mockGameNotActive,
  mockStatusGameId,
  mockGameStatus,
  mockGameRepository,
  mockPlayerRepository,
  mockLogger,
  resetAllMocks,
  setupDefaultMocks,
} from '../../../../src/mocks/game.mocks.js';

describe('GameService', () => {
  let gameService;

  beforeEach(() => {
    resetAllMocks();

    // Configurar mocks padrão
    const mocks = setupDefaultMocks();

    // Mock das implementações dos repositórios
    GameRepository.mockImplementation(() => mocks.gameRepository);
    PlayerRepository.mockImplementation(() => mocks.playerRepository);

    // Mock dos métodos do logger
    logger.info = mocks.logger.info;
    logger.warn = mocks.logger.warn;
    logger.error = mocks.logger.error;

    // Mock dos schemas
    gameResponseDtoSchema.parse = mocks.schemas.gameResponseDtoSchema.parse;
    updateGameDtoSchema.parse = mocks.schemas.updateGameDtoSchema.parse;
    createGameDtoSchema.parse = mocks.schemas.createGameDtoSchema.parse;

    // Criar instância do serviço
    gameService = new GameService();

    // Substituir dependências mockadas
    gameService.playerRepository = mocks.playerRepository;
    gameService.logger = mocks.logger;
  });

  describe('Constructor', () => {
    it('should initialize with GameRepository instance', () => {
      expect(GameRepository).toHaveBeenCalledTimes(1);
      expect(gameService.gameRepository).toBe(mockGameRepository);
    });
  });

  describe('getAllGames', () => {
    it('should return all games formatted as DTO', async () => {
      const mockGames = [
        mockGame,
        { ...mockGame, _id: { toString: () => '456' } },
      ];
      mockGameRepository.findAll.mockResolvedValue(mockGames);

      const result = await gameService.getAllGames();

      expect(mockGameRepository.findAll).toHaveBeenCalledTimes(1);
      expect(gameResponseDtoSchema.parse).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockParsedGame);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Attempting to retrieve all games.',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully retrieved ${mockGames.length} games.`,
      );
    });

    it('should propagate repository error', async () => {
      const mockError = new Error('Database error');
      mockGameRepository.findAll.mockRejectedValue(mockError);

      await expect(gameService.getAllGames()).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retrieve all games'),
      );
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
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Attempting to retrieve game by ID: ${gameId}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game with ID ${gameId} retrieved successfully.`,
      );
    });

    it('should throw Game not found error', async () => {
      const gameId = 'invalid';
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(gameService.getGameById(gameId)).rejects.toThrow(
        'Game not found',
      );

      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Game with ID ${gameId} not found.`,
      );
    });
  });

  describe('createGame', () => {
    it('should create game with valid data', async () => {
      const createdGame = {
        _id: { toString: () => 'new-game-id' },
        title: mockCreateGameData.name,
        rules: mockCreateGameData.rules,
        status: 'Waiting',
        maxPlayers: mockCreateGameData.maxPlayers,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGameRepository.createGame.mockResolvedValue(createdGame);

      const result = await gameService.createGame(
        mockCreateGameData,
        mockUserId,
      );

      expect(mockGameRepository.createGame).toHaveBeenCalledWith({
        title: mockCreateGameData.name,
        rules: mockCreateGameData.rules,
        maxPlayers: mockCreateGameData.maxPlayers,
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
        gameService.createGame(mockCreateGameData, mockUserId),
      ).rejects.toThrow('Validation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create game'),
      );
    });
  });

  describe('updateGame', () => {
    it('should update existing game', async () => {
      const updatedGame = {
        ...mockGame,
        title: 'Updated Title',
        status: 'Active',
        _id: { toString: () => mockGameIdForUpdate },
      };

      mockGameRepository.update.mockResolvedValue(updatedGame);

      const result = await gameService.updateGame(
        mockGameIdForUpdate,
        mockUpdateData,
      );

      expect(updateGameDtoSchema.parse).toHaveBeenCalledWith(mockUpdateData);
      expect(mockGameRepository.update).toHaveBeenCalledWith(
        mockGameIdForUpdate,
        mockUpdateData,
      );
      expect(gameResponseDtoSchema.parse).toHaveBeenCalled();
      expect(result).toEqual(mockParsedGame);
    });

    it('should throw Game not found error', async () => {
      mockGameRepository.update.mockResolvedValue(null);

      await expect(
        gameService.updateGame(mockGameIdForUpdate, mockUpdateData),
      ).rejects.toThrow('Game not found');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Game with ID ${mockGameIdForUpdate} not found for update.`,
      );
    });

    it('should validate input data with schema', async () => {
      const invalidData = { invalidField: 'value' };

      updateGameDtoSchema.parse.mockImplementation(() => {
        throw new Error('Validation error');
      });

      await expect(
        gameService.updateGame(mockGameIdForUpdate, invalidData),
      ).rejects.toThrow('Validation error');
    });
  });

  describe('deleteGame', () => {
    it('should delete existing game', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      mockGameRepository.delete.mockResolvedValue(mockGame);

      const result = await gameService.deleteGame(mockGameIdForDelete);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(
        mockGameIdForDelete,
      );
      expect(mockGameRepository.delete).toHaveBeenCalledWith(
        mockGameIdForDelete,
      );
      expect(result).toEqual(mockGame);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game with ID ${mockGameIdForDelete} deleted successfully.`,
      );
    });

    it('should throw Game not found error before deletion', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(gameService.deleteGame(mockGameIdForDelete)).rejects.toThrow(
        'Game not found',
      );

      expect(mockGameRepository.delete).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Game with ID ${mockGameIdForDelete} not found for deletion.`,
      );
    });
  });

  describe('joinGame', () => {
    beforeEach(() => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        _id: mockJoinGameId,
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
      const result = await gameService.joinGame(
        mockJoinGameUserId,
        mockJoinGameId,
      );

      expect(mockGameRepository.findById).toHaveBeenCalledWith(mockJoinGameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'User joined the game successfully',
        gameId: mockJoinGameId,
        currentPlayerCount: 2,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockJoinGameUserId} attempting to join game ${mockJoinGameId}.`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockJoinGameUserId} successfully joined game ${mockJoinGameId}.`,
      );
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(
        gameService.joinGame(mockJoinGameUserId, mockJoinGameId),
      ).rejects.toThrow('Game not found');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Join game failed for user ${mockJoinGameUserId}: Game ${mockJoinGameId} not found.`,
      );
    });

    it('should throw error when game is not Waiting', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        status: 'Active',
      });

      await expect(
        gameService.joinGame(mockJoinGameUserId, mockJoinGameId),
      ).rejects.toThrow(
        'Game is not accepting new players (Already Active or Ended)',
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Join game failed for user ${mockJoinGameUserId} in game ${mockJoinGameId}: Game not in 'Waiting' status.`,
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

      await expect(
        gameService.joinGame(mockJoinGameUserId, mockJoinGameId),
      ).rejects.toThrow('Game is full');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Join game failed for user ${mockJoinGameUserId} in game ${mockJoinGameId}: Game is full.`,
      );
    });

    it('should throw error when user already in game', async () => {
      const existingUserId = 'creator123';

      await expect(
        gameService.joinGame(existingUserId, mockJoinGameId),
      ).rejects.toThrow('User is already in this game');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Join game failed for user ${existingUserId} in game ${mockJoinGameId}: User already in this game.`,
      );
    });
  });

  describe('setPlayerReady', () => {
    beforeEach(() => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        _id: mockReadyGameId,
        players: [
          { _id: mockReadyUserId, ready: false, position: 0 },
          { _id: 'player456', ready: true, position: 0 },
        ],
      });
      mockGameRepository.save.mockResolvedValue({});
    });

    it('should mark player as ready', async () => {
      const result = await gameService.setPlayerReady(
        mockReadyUserId,
        mockReadyGameId,
      );

      expect(mockGameRepository.findById).toHaveBeenCalledWith(mockReadyGameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Player set to ready',
        playersReadyCount: 2,
        totalPlayers: 2,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockReadyUserId} attempting to set ready in game ${mockReadyGameId}.`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockReadyUserId} successfully set ready in game ${mockReadyGameId}.`,
      );
    });

    it('should return Already ready when player already ready', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        players: [{ _id: mockReadyUserId, ready: true, position: 0 }],
      });

      const result = await gameService.setPlayerReady(
        mockReadyUserId,
        mockReadyGameId,
      );

      expect(result).toEqual({
        success: true,
        message: 'Already ready',
        playersReadyCount: 1,
        totalPlayers: 1,
      });
      expect(mockGameRepository.save).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockReadyUserId} in game ${mockReadyGameId} is already ready.`,
      );
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(
        gameService.setPlayerReady(mockReadyUserId, mockReadyGameId),
      ).rejects.toThrow('Game not found');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Set player ready failed for user ${mockReadyUserId}: Game ${mockReadyGameId} not found.`,
      );
    });

    it('should throw error when game not Waiting', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        status: 'Active',
      });

      await expect(
        gameService.setPlayerReady(mockReadyUserId, mockReadyGameId),
      ).rejects.toThrow('Cannot ready now');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Set player ready failed for user ${mockReadyUserId} in game ${mockReadyGameId}: Game not in 'Waiting' status.`,
      );
    });

    it('should throw error when player not in game', async () => {
      const nonPlayerId = 'nonPlayer123';

      await expect(
        gameService.setPlayerReady(nonPlayerId, mockReadyGameId),
      ).rejects.toThrow('You are not in this game');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Set player ready failed for user ${nonPlayerId} in game ${mockReadyGameId}: User not in this game.`,
      );
    });
  });

  describe('startGame', () => {
    beforeEach(() => {
      mockGameRepository.findById.mockResolvedValue(mockGameWithAllReady);
      mockGameRepository.save.mockResolvedValue({});
    });

    it('should start game when all conditions met', async () => {
      const result = await gameService.startGame(
        mockCreatorId,
        mockStartGameId,
      );

      expect(mockGameRepository.findById).toHaveBeenCalledWith(mockStartGameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(gameResponseDtoSchema.parse).toHaveBeenCalled();
      expect(result).toEqual(mockParsedGame);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockCreatorId} attempting to start game ${mockStartGameId}.`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game ${mockStartGameId} successfully started by user ${mockCreatorId}.`,
      );
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(
        gameService.startGame(mockCreatorId, mockStartGameId),
      ).rejects.toThrow('Game not found');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Game start failed for user ${mockCreatorId}: Game ${mockStartGameId} not found.`,
      );
    });

    it('should throw error when user is not creator', async () => {
      const nonCreatorId = 'nonCreator123';

      await expect(
        gameService.startGame(nonCreatorId, mockStartGameId),
      ).rejects.toThrow('Only the game creator can start the game');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Game start failed for user ${nonCreatorId} in game ${mockStartGameId}: Not the game creator.`,
      );
    });

    it('should throw error when game already started', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGameWithAllReady,
        status: 'Active',
      });

      await expect(
        gameService.startGame(mockCreatorId, mockStartGameId),
      ).rejects.toThrow('Game has already started');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Game start failed for user ${mockCreatorId} in game ${mockStartGameId}: Game already started.`,
      );
    });

    it('should throw error when insufficient players', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGameWithAllReady,
        players: [{ _id: 'player1', ready: true, position: 0 }],
        minPlayers: 3,
        status: 'Waiting',
      });

      await expect(
        gameService.startGame(mockCreatorId, mockStartGameId),
      ).rejects.toThrow('Minimum 3 players required to start');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Game start failed for user ${mockCreatorId} in game ${mockStartGameId}: Not enough players (1/3).`,
      );
    });

    it('should throw error when not all players are ready', async () => {
      mockGameRepository.findById.mockResolvedValue({
        ...mockGameWithAllReady,
        players: [
          { _id: 'player1', ready: true, position: 0 },
          { _id: 'player2', ready: false, position: 0 },
        ],
        status: 'Waiting',
        minPlayers: 2,
      });

      await expect(
        gameService.startGame(mockCreatorId, mockStartGameId),
      ).rejects.toThrow('Not all players are ready');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Game start failed for user ${mockCreatorId} in game ${mockStartGameId}: Not all players are ready.`,
      );
    });
  });

  describe('abandonGame', () => {
    beforeEach(() => {
      mockGameRepository.findById.mockResolvedValue(mockActiveGame);
      mockGameRepository.save.mockImplementation((game) =>
        Promise.resolve(game),
      );
    });

    it('should allow player to abandon active game', async () => {
      const result = await gameService.abandonGame(
        mockAbandonUserId,
        mockAbandonGameId,
      );

      expect(mockGameRepository.findById).toHaveBeenCalledWith(
        mockAbandonGameId,
      );
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: 'You left the game' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockAbandonUserId} attempting to abandon game ${mockAbandonGameId}.`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${mockAbandonUserId} successfully abandoned game ${mockAbandonGameId}.`,
      );
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(
        gameService.abandonGame(mockAbandonUserId, mockAbandonGameId),
      ).rejects.toThrow('Game not found');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Abandon game failed for user ${mockAbandonUserId}: Game ${mockAbandonGameId} not found.`,
      );
    });

    it('should throw error when player not in game', async () => {
      const nonPlayerId = 'nonPlayer123';

      await expect(
        gameService.abandonGame(nonPlayerId, mockAbandonGameId),
      ).rejects.toThrow('You are not in this game');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Abandon game failed for user ${nonPlayerId} in game ${mockAbandonGameId}: User not in this game.`,
      );
    });

    it('should throw error when game not Active', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGameNotActive);

      await expect(
        gameService.abandonGame(mockAbandonUserId, mockAbandonGameId),
      ).rejects.toThrow('Cannot abandon now');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Abandon game failed for user ${mockAbandonUserId} in game ${mockAbandonGameId}: Game not in 'Active' status.`,
      );
    });

    it('should end game when only one player remains', async () => {
      const twoPlayerGame = {
        ...mockActiveGame,
        players: [
          { _id: mockAbandonUserId, ready: true, position: 1 },
          { _id: 'player456', ready: true, position: 2 },
        ],
      };

      mockGameRepository.findById.mockResolvedValue(twoPlayerGame);
      mockGameRepository.update.mockResolvedValue({}); // _endGame calls update

      await gameService.abandonGame(mockAbandonUserId, mockAbandonGameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(
        mockAbandonGameId,
      );
      expect(mockGameRepository.update).toHaveBeenCalledWith(
        mockAbandonGameId,
        expect.objectContaining({
          status: 'Ended',
          winnerId: 'player456',
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game ${mockAbandonGameId} ended due to last player (player456) remaining after abandonment.`,
      );
    });

    it('should end game when all players abandoned', async () => {
      const singlePlayerGame = {
        ...mockActiveGame,
        players: [{ _id: mockAbandonUserId, ready: true, position: 1 }],
      };

      mockGameRepository.findById.mockResolvedValue(singlePlayerGame);
      mockGameRepository.update.mockResolvedValue({}); // _endGame calls update

      await gameService.abandonGame(mockAbandonUserId, mockAbandonGameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(
        mockAbandonGameId,
      );
      expect(mockGameRepository.update).toHaveBeenCalledWith(
        mockAbandonGameId,
        expect.objectContaining({
          status: 'Ended',
          winnerId: null,
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Game ${mockAbandonGameId} ended as all players abandoned.`,
      );
    });
  });

  describe('getGameStatus', () => {
    it('should return game status', async () => {
      mockGameRepository.findGameStatus.mockResolvedValue(mockGameStatus);

      const result = await gameService.getGameStatus(mockStatusGameId);

      expect(mockGameRepository.findGameStatus).toHaveBeenCalledWith(
        mockStatusGameId,
      );
      expect(result).toBe('Active');
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Attempting to retrieve status for game ID: ${mockStatusGameId}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully retrieved status for game ID ${mockStatusGameId}: Active`,
      );
    });

    it('should throw error for invalid ID', async () => {
      const invalidIds = ['', null, undefined];

      for (const invalidId of invalidIds) {
        await expect(gameService.getGameStatus(invalidId)).rejects.toThrow(
          'Invalid game ID',
        );

        expect(mockLogger.warn).toHaveBeenCalledWith(
          `Get game status failed: Invalid game ID provided - "${invalidId}".`,
        );
      }
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findGameStatus.mockResolvedValue(null);

      await expect(gameService.getGameStatus(mockStatusGameId)).rejects.toThrow(
        'Game not found',
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Get game status failed: Game with ID ${mockStatusGameId} not found.`,
      );
    });

    it('should trim ID before querying', async () => {
      const gameIdWithSpaces = '   game123  ';
      const mockGameStatusWithWaiting = {
        _id: 'game123',
        status: 'Waiting',
      };

      mockGameRepository.findGameStatus.mockResolvedValue(
        mockGameStatusWithWaiting,
      );

      const result = await gameService.getGameStatus(gameIdWithSpaces);

      expect(mockGameRepository.findGameStatus).toHaveBeenCalledWith('game123');
      expect(result).toBe('Waiting');
    });
  });

  describe('getGamePlayers', () => {
    beforeEach(() => {
      mockGameRepository.findById.mockClear();
      mockPlayerRepository.findById.mockClear();
      mockLogger.info.mockClear();
      mockLogger.warn.mockClear();
      mockLogger.error.mockClear();
    });

    it('deve retornar a lista de jogadores com sucesso quando o jogo existe', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGameData);
      mockPlayerRepository.findById
        .mockResolvedValueOnce(mockPlayer1)
        .mockResolvedValueOnce(mockPlayer2);

      const result = await gameService.getGamePlayers(mockGameId);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(
        mockGameId.trim(),
      );
      expect(mockPlayerRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Attempting to get players for game ID: ${mockGameId}`,
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully retrieved 2 players for game ID ${mockGameId.trim()}.`,
      );

      expect(result).toEqual({
        gameId: mockGameId,
        gameTitle: 'UNO Game Test',
        gameStatus: 'Waiting',
        totalPlayers: 2,
        maxPlayers: 4,
        players: [
          {
            id: mockPlayerId1,
            username: 'player1',
            email: 'player1@example.com',
            ready: true,
            position: 1,
          },
          {
            id: mockPlayerId2,
            username: 'player2',
            email: 'player2@example.com',
            ready: false,
            position: 2,
          },
        ],
      });
    });

    it('deve lançar erro quando o ID do jogo é inválido', async () => {
      const invalidGameId = '';

      await expect(gameService.getGamePlayers(invalidGameId)).rejects.toThrow(
        'Invalid game ID',
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Get game players failed: Invalid game ID provided - "${invalidGameId}".`,
      );
      expect(mockGameRepository.findById).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando o jogo não é encontrado', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(gameService.getGamePlayers(mockGameId)).rejects.toThrow(
        'Game not found',
      );

      expect(mockGameRepository.findById).toHaveBeenCalledWith(
        mockGameId.trim(),
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Get game players failed: Game with ID ${mockGameId} not found.`,
      );
    });

    it('deve lidar com falha ao buscar detalhes de um jogador específico', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGameData);
      mockPlayerRepository.findById
        .mockResolvedValueOnce(mockPlayer1)
        .mockRejectedValueOnce(new Error('Player not found'));

      const result = await gameService.getGamePlayers(mockGameId);

      expect(result.players).toHaveLength(2);
      expect(result.players[0]).toEqual({
        id: mockPlayerId1,
        username: 'player1',
        email: 'player1@example.com',
        ready: true,
        position: 1,
      });

      expect(result.players[1]).toEqual({
        id: mockPlayerId2,
        username: 'Unknown',
        email: 'unknown@example.com',
        ready: false,
        position: 2,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch details for player'),
      );
    });

    it('deve retornar lista vazia quando não há jogadores no jogo', async () => {
      const emptyGame = {
        ...mockGameData,
        players: [],
      };
      mockGameRepository.findById.mockResolvedValue(emptyGame);

      const result = await gameService.getGamePlayers(mockGameId);

      expect(result.totalPlayers).toBe(0);
      expect(result.players).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully retrieved 0 players for game ID ${mockGameId.trim()}.`,
      );
    });

    it('deve tratar IDs de jogo com espaços em branco', async () => {
      const gameIdWithSpaces = '  ' + mockGameId + '  ';

      mockGameRepository.findById.mockResolvedValue(mockGameData);
      mockPlayerRepository.findById
        .mockResolvedValueOnce(mockPlayer1)
        .mockResolvedValueOnce(mockPlayer2);

      await gameService.getGamePlayers(gameIdWithSpaces);

      expect(mockGameRepository.findById).toHaveBeenCalledWith(mockGameId);
    });

    it('deve incluir informações do jogo na resposta', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGameData);
      mockPlayerRepository.findById
        .mockResolvedValueOnce(mockPlayer1)
        .mockResolvedValueOnce(mockPlayer2);

      const result = await gameService.getGamePlayers(mockGameId);

      expect(result.gameTitle).toBe('UNO Game Test');
      expect(result.gameStatus).toBe('Waiting');
      expect(result.maxPlayers).toBe(4);
      expect(result.gameId).toBe(mockGameId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ID strings for getGameById', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(gameService.getGameById('')).rejects.toThrow(
        'Game not found',
      );
    });

    it('should handle undefined IDs for getGameById', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

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
      const gameWithObjectId = {
        ...mockGame,
        _id: { toString: () => '123' },
      };

      mockGameRepository.findById.mockResolvedValue(gameWithObjectId);

      gameResponseDtoSchema.parse.mockReturnValue({
        ...mockParsedGame,
        id: '123',
      });

      const result = await gameService.getGameById(gameId);

      expect(result.id).toBe('123');
    });
  });

  describe('Cenários de Borda para getGamePlayers', () => {
    it('deve lidar com jogador sem detalhes disponíveis', async () => {
      const testGameId = 'game123';
      const testPlayerId = 'player456';

      const testGame = {
        _id: testGameId,
        title: 'Test Game',
        status: 'Active',
        maxPlayers: 4,
        players: [{ _id: testPlayerId, ready: true, position: 1 }],
      };

      mockGameRepository.findById.mockResolvedValue(testGame);
      mockPlayerRepository.findById.mockResolvedValue(null);

      const result = await gameService.getGamePlayers(testGameId);

      expect(result.players[0]).toEqual({
        id: testPlayerId,
        username: 'Unknown',
        email: 'unknown@example.com',
        ready: true,
        position: 1,
      });
    });

    it('deve lidar com falha ao buscar detalhes de um jogador específico', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGameData);
      mockPlayerRepository.findById
        .mockResolvedValueOnce(mockPlayer1)
        .mockRejectedValueOnce(new Error('Player not found'));

      const result = await gameService.getGamePlayers(mockGameId);

      expect(result.players).toHaveLength(2);
      expect(result.players[0]).toEqual({
        id: mockPlayerId1,
        username: 'player1',
        email: 'player1@example.com',
        ready: true,
        position: 1,
      });

      expect(result.players[1]).toEqual({
        id: mockPlayerId2,
        username: 'Unknown',
        email: 'unknown@example.com',
        ready: false,
        position: 2,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch details for player'),
      );
    });

    it('deve retornar lista vazia quando não há jogadores no jogo', async () => {
      const emptyGame = {
        ...mockGameData,
        players: [],
      };
      mockGameRepository.findById.mockResolvedValue(emptyGame);

      const result = await gameService.getGamePlayers(mockGameId);

      expect(result.totalPlayers).toBe(0);
      expect(result.players).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully retrieved 0 players for game ID ${mockGameId.trim()}.`,
      );
    });

    it('deve lidar com erro inesperado no repositório', async () => {
      const testGameId = 'game123';
      const error = new Error('Database connection failed');

      mockGameRepository.findById.mockRejectedValue(error);

      await expect(gameService.getGamePlayers(testGameId)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get players for game ID'),
      );
    });
  });
  describe('getDiscardTop', () => {
    it('deve retornar a carta superior da pilha de descarte quando o jogo está ativo e há cartas', async () => {
      const gameId = 'game-123';
      const mockGameWithDiscard = {
        _id: gameId,
        status: 'Active',
        discardPile: [
          {
            cardId: 'card-1',
            color: 'red',
            value: '5',
            type: 'number',
            playedBy: 'player-1',
            playedAt: new Date('2024-01-01T10:00:00Z'),
            order: 1,
          },
          {
            cardId: 'card-2',
            color: 'blue',
            value: 'skip',
            type: 'action',
            playedBy: 'player-2',
            playedAt: new Date('2024-01-01T10:01:00Z'),
            order: 2,
          },
        ],
        initialCard: {
          color: 'blue',
          value: '0',
          type: 'number',
        },
      };

      mockGameRepository.findDiscardTop.mockResolvedValue(mockGameWithDiscard);

      const result = await gameService.getDiscardTop(gameId);

      expect(mockGameRepository.findDiscardTop).toHaveBeenCalledWith(gameId);
      expect(result).toEqual({
        game_id: gameId,
        current_top_card: {
          card_id: 'card-2',
          color: 'blue',
          value: 'skip',
          type: 'action',
          played_by: 'player-2',
          played_at: new Date('2024-01-01T10:01:00Z'),
          order: 2,
        },
        recent_cards: [
          {
            color: 'blue',
            value: 'skip',
            type: 'action',
            played_by: 'player-2',
            order: 2,
          },
          {
            color: 'red',
            value: '5',
            type: 'number',
            played_by: 'player-1',
            order: 1,
          },
        ],
        discard_pile_size: 2,
      });
    });

    it('deve retornar mensagem de pilha vazia quando não há cartas descartadas', async () => {
      const gameId = 'game-123';
      const mockGameEmptyDiscard = {
        _id: gameId,
        status: 'Active',
        discardPile: [],
        initialCard: {
          color: 'blue',
          value: '0',
          type: 'number',
        },
      };

      mockGameRepository.findDiscardTop.mockResolvedValue(mockGameEmptyDiscard);

      const result = await gameService.getDiscardTop(gameId);

      expect(result).toEqual({
        game_id: gameId,
        top_card: null,
        message: 'Discard pile is empty - no cards have been played yet',
        discard_pile_size: 0,
        initial_card: {
          color: 'blue',
          value: '0',
          type: 'number',
        },
      });
    });

    it('deve retornar estado de espera quando o jogo não começou', async () => {
      const gameId = 'game-123';
      const mockWaitingGame = {
        _id: gameId,
        status: 'Waiting',
        discardPile: [],
        initialCard: {
          color: 'red',
          value: '3',
          type: 'number',
        },
      };

      mockGameRepository.findDiscardTop.mockResolvedValue(mockWaitingGame);

      const result = await gameService.getDiscardTop(gameId);

      expect(result).toEqual({
        game_id: gameId,
        error: 'Game has not started yet',
        game_state: 'waiting',
        initial_card: {
          color: 'red',
          value: '3',
          type: 'number',
        },
      });
    });

    it('deve lidar com carta curinga na pilha de descarte', async () => {
      const gameId = 'game-123';
      const mockGameWithWild = {
        _id: gameId,
        status: 'Active',
        discardPile: [
          {
            cardId: 'card-wild',
            color: 'wild',
            value: 'wild',
            type: 'wild',
            playedBy: 'player-1',
            playedAt: new Date(),
            order: 1,
          },
        ],
        initialCard: {
          color: 'blue',
          value: '0',
          type: 'number',
        },
      };

      mockGameRepository.findDiscardTop.mockResolvedValue(mockGameWithWild);

      const result = await gameService.getDiscardTop(gameId);

      expect(result.current_top_card.color).toBe('wild');
      expect(result.current_top_card.type).toBe('wild');
    });

    it('deve lançar erro quando o jogo não é encontrado', async () => {
      const gameId = 'non-existent-game';
      mockGameRepository.findDiscardTop.mockResolvedValue(null);

      await expect(gameService.getDiscardTop(gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve lançar erro quando o ID do jogo é inválido', async () => {
      const invalidGameId = '';

      await expect(gameService.getDiscardTop(invalidGameId)).rejects.toThrow(
        'Invalid game ID',
      );

      expect(mockGameRepository.findDiscardTop).not.toHaveBeenCalled();
    });

    it('deve limitar corretamente as cartas recentes a 5', async () => {
      const gameId = 'game-123';
      const discardPile = [];

      for (let i = 1; i <= 8; i++) {
        discardPile.push({
          cardId: `card-${i}`,
          color: 'red',
          value: i.toString(),
          type: 'number',
          playedBy: `player-${(i % 4) + 1}`,
          playedAt: new Date(`2024-01-01T10:0${i}:00Z`),
          order: i,
        });
      }

      const mockGame = {
        _id: gameId,
        status: 'Active',
        discardPile,
        initialCard: {
          color: 'blue',
          value: '0',
          type: 'number',
        },
      };

      mockGameRepository.findDiscardTop.mockResolvedValue(mockGame);

      const result = await gameService.getDiscardTop(gameId);

      expect(result.recent_cards).toHaveLength(5);
      expect(result.recent_cards[0].order).toBe(8);
      expect(result.recent_cards[4].order).toBe(4);
    });

    it('deve lidar com playedBy ausente', async () => {
      const gameId = 'game-123';
      const mockGame = {
        _id: gameId,
        status: 'Active',
        discardPile: [
          {
            cardId: 'card-1',
            color: 'red',
            value: '5',
            type: 'number',
            // playedBy is missing
            playedAt: new Date(),
            order: 1,
          },
        ],
        initialCard: {
          color: 'blue',
          value: '0',
          type: 'number',
        },
      };

      mockGameRepository.findDiscardTop.mockResolvedValue(mockGame);

      const result = await gameService.getDiscardTop(gameId);

      expect(result.current_top_card.played_by).toBe('system');
    });

    it('deve usar initialCard padrão quando null', async () => {
      const gameId = 'game-123';
      const mockGame = {
        _id: gameId,
        status: 'Waiting',
        discardPile: [],
        initialCard: null,
      };

      mockGameRepository.findDiscardTop.mockResolvedValue(mockGame);

      const result = await gameService.getDiscardTop(gameId);

      expect(result.initial_card).toEqual({
        color: 'blue',
        value: '0',
        type: 'number',
      });
    });
  });

  describe('getDiscardTopSimple', () => {
    let originalGameServiceGetDiscardTop;

    beforeEach(() => {
      originalGameServiceGetDiscardTop = gameService.getDiscardTop;
    });

    afterEach(() => {
      if (gameService.getDiscardTop !== originalGameServiceGetDiscardTop) {
        gameService.getDiscardTop = originalGameServiceGetDiscardTop;
      }
    });

    it('deve retornar nome formatado da carta quando há cartas na pilha', async () => {
      const gameId = 'game-123';

      gameService.getDiscardTop = jest.fn().mockResolvedValue({
        game_id: gameId,
        current_top_card: {
          card_id: 'card-1',
          color: 'red',
          value: '5',
          type: 'number',
          played_by: 'player-1',
          played_at: new Date(),
          order: 1,
        },
        recent_cards: [],
        discard_pile_size: 1,
      });

      const result = await gameService.getDiscardTopSimple(gameId);

      expect(gameService.getDiscardTop).toHaveBeenCalledWith(gameId);
      expect(result.game_ids).toEqual([gameId]);
      expect(result.top_cards).toBeDefined();
    });

    it('deve retornar array vazio quando a pilha de descarte está vazia', async () => {
      const gameId = 'game-123';

      gameService.getDiscardTop = jest.fn().mockResolvedValue({
        game_id: gameId,
        top_card: null,
        message: 'Discard pile is empty',
        discard_pile_size: 0,
        initial_card: {
          color: 'blue',
          value: '0',
          type: 'number',
        },
      });

      const result = await gameService.getDiscardTopSimple(gameId);

      expect(result.top_cards).toEqual([]);
    });

    it('deve retornar erro quando getDiscardTop retorna erro', async () => {
      const gameId = 'game-123';

      gameService.getDiscardTop = jest.fn().mockResolvedValue({
        game_id: gameId,
        error: 'Game has not started yet',
        game_state: 'waiting',
        initial_card: {
          color: 'blue',
          value: '0',
          type: 'number',
        },
      });

      const result = await gameService.getDiscardTopSimple(gameId);

      expect(result.error).toBe('Game has not started yet');
    });

    it('deve lidar com carta curinga usando mapeamento de cor', async () => {
      const gameId = 'game-123';

      gameService.getDiscardTop = jest.fn().mockResolvedValue({
        game_id: gameId,
        current_top_card: {
          card_id: 'card-wild',
          color: 'wild',
          value: 'wild',
          type: 'wild',
          played_by: 'player-1',
          played_at: new Date(),
          order: 1,
        },
        recent_cards: [],
        discard_pile_size: 1,
      });

      const result = await gameService.getDiscardTopSimple(gameId);

      expect(result.top_cards).toBeDefined();
    });

    it('deve lidar com cartas de ação usando mapeamento de valor', async () => {
      const gameId = 'game-123';

      gameService.getDiscardTop = jest.fn().mockResolvedValue({
        game_id: gameId,
        current_top_card: {
          card_id: 'card-skip',
          color: 'blue',
          value: 'skip',
          type: 'action',
          played_by: 'player-1',
          played_at: new Date(),
          order: 1,
        },
        recent_cards: [],
        discard_pile_size: 1,
      });

      const result = await gameService.getDiscardTopSimple(gameId);

      expect(result.top_cards).toBeDefined();
    });

    it('deve usar fallback quando cor ou valor não estão nos mapas', async () => {
      const gameId = 'game-123';

      gameService.getDiscardTop = jest.fn().mockResolvedValue({
        game_id: gameId,
        current_top_card: {
          card_id: 'card-unknown',
          color: 'purple',
          value: 'unknown',
          type: 'custom',
          played_by: 'player-1',
          played_at: new Date(),
          order: 1,
        },
        recent_cards: [],
        discard_pile_size: 1,
      });

      const result = await gameService.getDiscardTopSimple(gameId);

      expect(result.top_cards).toBeDefined();
    });
  });
});
