import GameService from '../game.service.js';
import GameRepository from '../../../infra/repositories/game.repository.js';
import gameResponseDtoSchema from '../../../presentation/dtos/gameResponse.dto.js';
import updateGameDtoSchema from '../../../presentation/dtos/updateGame.dto.js';

// Mock das dependências
jest.mock('../../../infra/repositories/game.repository.js');
jest.mock('../../../presentation/dtos/gameResponse.dto.js');
jest.mock('../../../presentation/dtos/updateGame.dto.js');

describe('GameService', () => {
  let gameService;
  let mockGameRepository;

  // Dados mockados para reutilização
  const mockGame = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Game',
    status: 'Waiting',
    maxPlayers: 4,
    minPlayers: 2,
    creatorId: 'creator123',
    players: [
      { _id: 'creator123', ready: true, position: 1 },
      { _id: 'player456', ready: false, position: 2 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockParsedGame = {
    id: '507f1f77bcf86cd799439011',
    title: 'Test Game',
    status: 'Waiting',
    maxPlayers: 4,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Configurar mock do repository
    mockGameRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      createGame: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
      findGameStatus: jest.fn(),
    };

    // Configurar o mock da classe para retornar nossa instância mockada
    GameRepository.mockImplementation(() => mockGameRepository);

    // Criar instância do service
    gameService = new GameService();

    // Configurar mocks padrão dos DTOs
    gameResponseDtoSchema.parse.mockReturnValue(mockParsedGame);
    updateGameDtoSchema.parse.mockImplementation((data) => data);
  });

  describe('Constructor', () => {
    it('deve inicializar com uma instância do GameRepository', () => {
      expect(GameRepository).toHaveBeenCalledTimes(1);
      expect(gameService.gameRepository).toBe(mockGameRepository);
    });
  });

  describe('getAllGames', () => {
    it('deve retornar todos os jogos formatados como DTO', async () => {
      // Arrange
      const mockGames = [mockGame, { ...mockGame, _id: '456' }];
      mockGameRepository.findAll.mockResolvedValue(mockGames);

      // Act
      const result = await gameService.getAllGames();

      // Assert
      expect(mockGameRepository.findAll).toHaveBeenCalledTimes(1);
      expect(gameResponseDtoSchema.parse).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockParsedGame);
    });

    it('deve propagar erro quando repository falhar', async () => {
      // Arrange
      const mockError = new Error('Database error');
      mockGameRepository.findAll.mockRejectedValue(mockError);

      // Act & Assert
      await expect(gameService.getAllGames()).rejects.toThrow('Database error');
    });
  });

  describe('getGameById', () => {
    it('deve retornar jogo específico quando encontrado', async () => {
      // Arrange
      const gameId = '123';
      mockGameRepository.findById.mockResolvedValue(mockGame);

      // Act
      const result = await gameService.getGameById(gameId);

      // Assert
      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(gameResponseDtoSchema.parse).toHaveBeenCalledWith(mockGame);
      expect(result).toEqual(mockParsedGame);
    });

    it('deve lançar erro "Game not found" quando jogo não existe', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(gameService.getGameById('invalid')).rejects.toThrow(
        'Game not found',
      );
    });
  });

  describe('createGame', () => {
    const mockGameData = {
      title: 'New Game',
      maxPlayers: 4,
      minPlayers: 2,
    };

    const mockUserId = 'user123';

    it('deve criar jogo com dados válidos', async () => {
      // Arrange
      const createdGame = {
        ...mockGame,
        _id: 'new-game-id',
        title: mockGameData.title,
      };

      mockGameRepository.createGame.mockResolvedValue(createdGame);

      // Act
      const result = await gameService.createGame(mockGameData, mockUserId);

      // Assert
      expect(mockGameRepository.createGame).toHaveBeenCalledWith({
        ...mockGameData,
        creatorId: mockUserId,
        players: [{ _id: mockUserId, ready: true, position: 1 }],
      });

      expect(gameResponseDtoSchema.parse).toHaveBeenCalledWith({
        id: createdGame._id.toString(),
        title: createdGame.title,
        status: createdGame.status,
        maxPlayers: createdGame.maxPlayers,
        createdAt: createdGame.createdAt,
        updatedAt: createdGame.updatedAt,
      });

      expect(result).toEqual(mockParsedGame);
    });

    it('deve propagar erro quando criação falhar', async () => {
      // Arrange
      const mockError = new Error('Validation failed');
      mockGameRepository.createGame.mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        gameService.createGame(mockGameData, mockUserId),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('updateGame', () => {
    const gameId = '123';
    const updateData = { title: 'Updated Title', status: 'Active' };

    it('deve atualizar jogo existente', async () => {
      // Arrange
      const updatedGame = {
        ...mockGame,
        title: 'Updated Title',
        status: 'Active',
      };

      updateGameDtoSchema.parse.mockReturnValue(updateData);
      mockGameRepository.update.mockResolvedValue(updatedGame);

      // Act
      const result = await gameService.updateGame(gameId, updateData);

      // Assert
      expect(updateGameDtoSchema.parse).toHaveBeenCalledWith(updateData);
      expect(mockGameRepository.update).toHaveBeenCalledWith(
        gameId,
        updateData,
      );
      expect(gameResponseDtoSchema.parse).toHaveBeenCalled();
      expect(result).toEqual(mockParsedGame);
    });

    it('deve lançar erro "Game not found" quando jogo não existe', async () => {
      // Arrange
      updateGameDtoSchema.parse.mockReturnValue(updateData);
      mockGameRepository.update.mockResolvedValue(null);

      // Act & Assert
      await expect(gameService.updateGame(gameId, updateData)).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve validar dados de entrada com schema', async () => {
      // Arrange
      const invalidData = { invalidField: 'value' };
      const validationError = new Error('Validation error');
      updateGameDtoSchema.parse.mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(gameService.updateGame(gameId, invalidData)).rejects.toThrow(
        'Validation error',
      );
    });
  });

  describe('deleteGame', () => {
    const gameId = '123';

    it('deve deletar jogo existente', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue(mockGame);
      mockGameRepository.delete.mockResolvedValue(mockGame);

      // Act
      const result = await gameService.deleteGame(gameId);

      // Assert
      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.delete).toHaveBeenCalledWith(gameId);
      expect(result).toEqual(mockGame);
    });

    it('deve lançar erro "Game not found" antes de tentar deletar', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue(null);

      // Act & Assert
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
        players: [{ _id: 'creator123', ready: true, position: 1 }],
      });
      mockGameRepository.save.mockResolvedValue({});
    });

    it('deve permitir usuário entrar no jogo', async () => {
      // Act
      const result = await gameService.joinGame(userId, gameId);

      // Assert
      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'User joined the game successfully',
        gameId: mockGame._id,
        currentPlayerCount: 2,
      });
    });

    it('deve lançar erro quando jogo não existe', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(gameService.joinGame(userId, gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve lançar erro quando jogo não está em "Waiting"', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        status: 'Active',
      });

      // Act & Assert
      await expect(gameService.joinGame(userId, gameId)).rejects.toThrow(
        'Game is not accepting new players (Already Active or Ended)',
      );
    });

    it('deve lançar erro quando jogo está cheio', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        maxPlayers: 1,
        players: [{ _id: 'creator123', ready: true, position: 1 }],
      });

      // Act & Assert
      await expect(gameService.joinGame(userId, gameId)).rejects.toThrow(
        'Game is full',
      );
    });

    it('deve lançar erro quando usuário já está no jogo', async () => {
      // Arrange
      const existingUserId = 'creator123';

      // Act & Assert
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

    it('deve marcar jogador como ready', async () => {
      // Act
      const result = await gameService.setPlayerReady(userId, gameId);

      // Assert
      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Player set to ready',
        playersReadyCount: 2,
        totalPlayers: 2,
      });
    });

    it('deve retornar "Already ready" quando jogador já está pronto', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        players: [{ _id: userId, ready: true, position: 0 }],
      });

      // Act
      const result = await gameService.setPlayerReady(userId, gameId);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Already ready',
        playersReadyCount: 1,
        totalPlayers: 1,
      });
      expect(mockGameRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando jogo não existe', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(gameService.setPlayerReady(userId, gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve lançar erro quando jogo não está em "Waiting"', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue({
        ...mockGame,
        status: 'Active',
      });

      // Act & Assert
      await expect(gameService.setPlayerReady(userId, gameId)).rejects.toThrow(
        'Cannot ready now',
      );
    });

    it('deve lançar erro quando jogador não está no jogo', async () => {
      // Arrange
      const nonPlayerId = 'nonPlayer123';

      // Act & Assert
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

    it('deve iniciar jogo quando todas as condições são atendidas', async () => {
      // Act
      const result = await gameService.startGame(creatorId, gameId);

      // Assert
      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(gameResponseDtoSchema.parse).toHaveBeenCalled();
      expect(result).toEqual(mockParsedGame);
    });

    it('deve lançar erro quando jogo não existe', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(gameService.startGame(creatorId, gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve lançar erro quando usuário não é o criador', async () => {
      // Arrange
      const nonCreatorId = 'nonCreator123';

      // Act & Assert
      await expect(gameService.startGame(nonCreatorId, gameId)).rejects.toThrow(
        'Only the game creator can start the game',
      );
    });

    it('deve lançar erro quando jogo já começou', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue({
        ...gameWithAllReady,
        status: 'Active',
      });

      // Act & Assert
      await expect(gameService.startGame(creatorId, gameId)).rejects.toThrow(
        'Game has already started',
      );
    });

    it('deve lançar erro quando não tem jogadores suficientes', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue({
        ...gameWithAllReady,
        players: [{ _id: 'player1', ready: true, position: 0 }],
        minPlayers: 3,
        status: 'Waiting',
      });

      // Act & Assert
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

    it('deve permitir jogador abandonar jogo ativo', async () => {
      // Act
      const result = await gameService.abandonGame(userId, gameId);

      // Assert
      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockGameRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'You left the game',
      });
    });

    it('deve lançar erro quando jogo não existe', async () => {
      // Arrange
      mockGameRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(gameService.abandonGame(userId, gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve lançar erro quando jogador não está no jogo', async () => {
      // Arrange
      const nonPlayerId = 'nonPlayer123';

      // Act & Assert
      await expect(
        gameService.abandonGame(nonPlayerId, gameId),
      ).rejects.toThrow('You are not in this game');
    });

    it('deve finalizar jogo quando resta apenas um jogador', async () => {
      // Arrange
      const twoPlayerGame = {
        ...activeGame,
        players: [
          { _id: userId, ready: true, position: 1 },
          { _id: 'player456', ready: true, position: 2 },
        ],
      };

      mockGameRepository.findById.mockResolvedValue(twoPlayerGame);

      // Act
      await gameService.abandonGame(userId, gameId);

      // Assert
      const savedGame = mockGameRepository.save.mock.calls[0][0];
      expect(savedGame.status).toBe('Ended');
      expect(savedGame.winnerId).toBe('player456');
      expect(savedGame.players).toHaveLength(1);
    });
  });

  describe('getGameStatus', () => {
    const gameId = 'game123';

    it('deve retornar status do jogo', async () => {
      // Arrange
      mockGameRepository.findGameStatus.mockResolvedValue({
        _id: gameId,
        status: 'Active',
      });

      // Act
      const result = await gameService.getGameStatus(gameId);

      // Assert
      expect(mockGameRepository.findGameStatus).toHaveBeenCalledWith(gameId);
      expect(result).toBe('Active');
    });

    it('deve lançar erro para ID inválido', async () => {
      // Test cases para IDs inválidos
      const invalidIds = ['', null, undefined, 123, {}];

      for (const invalidId of invalidIds) {
        await expect(gameService.getGameStatus(invalidId)).rejects.toThrow(
          'Invalid game ID',
        );
      }
    });

    it('deve lançar erro quando jogo não existe', async () => {
      // Arrange
      mockGameRepository.findGameStatus.mockResolvedValue(null);

      // Act & Assert
      await expect(gameService.getGameStatus(gameId)).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve retornar diferentes status possíveis', async () => {
      // Arrange
      const statuses = ['Waiting', 'Active', 'Paused', 'Ended'];

      for (const status of statuses) {
        mockGameRepository.findGameStatus.mockResolvedValue({
          _id: gameId,
          status,
        });

        // Act
        const result = await gameService.getGameStatus(gameId);

        // Assert
        expect(result).toBe(status);
      }
    });

    it('deve fazer trim no ID antes de consultar', async () => {
      // Arrange
      const gameIdWithSpaces = '   game123  ';
      mockGameRepository.findGameStatus.mockResolvedValue({
        _id: 'game123',
        status: 'Waiting',
      });

      // Act
      const result = await gameService.getGameStatus(gameIdWithSpaces);

      // Assert
      expect(mockGameRepository.findGameStatus).toHaveBeenCalledWith('game123');
      expect(result).toBe('Waiting');
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com strings de ID vazias', async () => {
      await expect(gameService.getGameById('')).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve lidar com IDs undefined', async () => {
      await expect(gameService.getGameById(undefined)).rejects.toThrow(
        'Game not found',
      );
    });

    it('deve manter imutabilidade dos objetos de entrada', async () => {
      // Arrange
      const originalGameData = { title: 'Original', maxPlayers: 4 };
      const gameDataCopy = { ...originalGameData };

      mockGameRepository.createGame.mockResolvedValue(mockGame);

      // Act
      await gameService.createGame(originalGameData, 'user123');

      // Assert
      expect(originalGameData).toEqual(gameDataCopy);
    });

    it('deve converter ObjectId para string no DTO', async () => {
      // Arrange
      const gameId = '123';
      const gameWithObjectId = {
        ...mockGame,
        _id: { toString: () => '123' }, // Simulando ObjectId
      };

      mockGameRepository.findById.mockResolvedValue(gameWithObjectId);
      gameResponseDtoSchema.parse.mockReturnValue({
        ...mockParsedGame,
        id: '123',
      });

      // Act
      const result = await gameService.getGameById(gameId);

      // Assert
      expect(result.id).toBe('123');
    });
  });
});
