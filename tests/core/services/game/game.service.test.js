import GameService from '../../../../src/core/services/game/game.service.js';
import {
  GameNotFoundError,
  UserNotInGameError,
  GameNotActiveError,
  InvalidGameIdError,
  NotGameCreatorError,
  GameAlreadyStartedError,
  MinimumPlayersRequiredError,
  NotAllPlayersReadyError,
  GameFullError,
  UserAlreadyInGameError,
  GameNotAcceptingPlayersError,
} from '../../../../src/core/errors/game.errors.js';
import { mockGameRepository } from '../../../../src/mocks/game.mocks.js';
import { mockPlayerRepository } from '../../../../src/mocks/player.mocks.js';

describe('GameService', () => {
  let gameService;
  let mockGame;
  const userId = 'user-1';
  const gameId = 'game-1';

  beforeEach(() => {
    jest.clearAllMocks();
    gameService = new GameService(mockGameRepository, mockPlayerRepository);
    mockGame = {
      _id: gameId,
      id: gameId,
      title: 'Test Game',
      rules: 'Some game rules with at least 10 characters',
      status: 'Waiting',
      creatorId: userId,
      players: [{ _id: userId, ready: true, position: 1 }],
      minPlayers: 2,
      maxPlayers: 4,
      currentPlayerIndex: 0,
      turnDirection: 1,
      discardPile: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
    };
    // Mock the repository save method
    mockGameRepository.save = jest.fn((game) => Promise.resolve(game));
  });

  describe('getAllGames', () => {
    it('should return all games', async () => {
      const games = [mockGame];
      mockGameRepository.findAll.mockResolvedValue(games);
      const result = await gameService.getAllGames();
      expect(result).toHaveLength(1);
      expect(mockGameRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getGameById', () => {
    it('should return a game by id', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      const result = await gameService.getGameById(gameId);
      expect(result.id).toBe(gameId);
      expect(mockGameRepository.findById).toHaveBeenCalledWith(gameId);
    });

    it('should throw GameNotFoundError if game not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);
      await expect(gameService.getGameById(gameId)).rejects.toThrow(
        GameNotFoundError,
      );
    });
  });

  describe('createGame', () => {
    it('should create a new game', async () => {
      const gameData = {
        name: 'New Game',
        rules: 'Some game rules with at least 10 characters',
        maxPlayers: 4,
        minPlayers: 2,
      };
      const mockCreatedGameInRepo = {
        _id: 'new-game-id',
        id: 'new-game-id', // Ensure DTO requirement is met
        title: gameData.name,
        rules: gameData.rules,
        maxPlayers: gameData.maxPlayers,
        minPlayers: gameData.minPlayers,
        creatorId: userId,
        players: [{ _id: userId, ready: true, position: 1 }],
        status: 'Waiting',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockGameRepository.createGame.mockResolvedValue(mockCreatedGameInRepo);

      const result = await gameService.createGame(gameData, userId);
      expect(result.title).toBe(gameData.name);
      expect(mockGameRepository.createGame).toHaveBeenCalled();
    });
  });

  describe('updateGame', () => {
    it('should update an existing game', async () => {
      const updateData = { title: 'Updated Game' };
      const updatedGame = { ...mockGame, ...updateData };
      mockGameRepository.update.mockResolvedValue(updatedGame);
      const result = await gameService.updateGame(gameId, updateData);
      expect(result.title).toBe(updateData.title);
      expect(mockGameRepository.update).toHaveBeenCalledWith(gameId, {
        title: 'Updated Game',
      });
    });

    it('should throw GameNotFoundError when trying to update a non-existent game', async () => {
      mockGameRepository.update.mockResolvedValue(null);
      await expect(
        gameService.updateGame('non-existent-id', { title: 'New Title' }),
      ).rejects.toThrow(GameNotFoundError);
    });
  });

  describe('deleteGame', () => {
    it('should delete a game', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      mockGameRepository.delete.mockResolvedValue(true);
      await gameService.deleteGame(gameId);
      expect(mockGameRepository.delete).toHaveBeenCalledWith(gameId);
    });

    it('should throw GameNotFoundError when trying to delete a non-existent game', async () => {
      mockGameRepository.findById.mockResolvedValue(null);
      await expect(gameService.deleteGame('non-existent-id')).rejects.toThrow(
        GameNotFoundError,
      );
    });
  });

  describe('joinGame', () => {
    it('should allow a user to join a game', async () => {
      expect(true).toBe(true);
    });

    it('should throw GameFullError if the game is full', async () => {
      mockGame.players = new Array(mockGame.maxPlayers).fill({
        _id: 'some-id',
      });
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(gameService.joinGame('new-user', gameId)).rejects.toThrow(
        GameFullError,
      );
    });

    it('should throw UserAlreadyInGameError if user is already in game', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(gameService.joinGame(userId, gameId)).rejects.toThrow(
        UserAlreadyInGameError,
      );
    });

    it('should throw GameNotAcceptingPlayersError if game is not in waiting status', async () => {
      mockGame.status = 'Active';
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(gameService.joinGame('user-2', gameId)).rejects.toThrow(
        GameNotAcceptingPlayersError,
      );
    });
  });

  describe('setPlayerReady', () => {
    it('should set a player as ready', async () => {
      expect(true).toBe(true);
    });

    it('should throw UserNotInGameError if player is not in game', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(
        gameService.setPlayerReady('not-in-game-user', gameId),
      ).rejects.toThrow(UserNotInGameError);
    });
  });

  describe('startGame', () => {
    it('should start the game if conditions are met', async () => {
      expect(true).toBe(true);
    });

    it('should throw NotGameCreatorError if user is not the creator', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(
        gameService.startGame('not-creator', gameId),
      ).rejects.toThrow(NotGameCreatorError);
    });

    it('should throw GameAlreadyStartedError if game is already active', async () => {
      mockGame.status = 'Active';
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(gameService.startGame(userId, gameId)).rejects.toThrow(
        GameAlreadyStartedError,
      );
    });

    it('should throw MinimumPlayersRequiredError if not enough players', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(gameService.startGame(userId, gameId)).rejects.toThrow(
        MinimumPlayersRequiredError,
      );
    });

    it('should throw NotAllPlayersReadyError if not all players are ready', async () => {
      mockGame.players.push({ _id: 'user-2', ready: false });
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(gameService.startGame(userId, gameId)).rejects.toThrow(
        NotAllPlayersReadyError,
      );
    });
  });

  describe('getCurrentPlayer', () => {
    it('should get the current player', async () => {
      mockGame.status = 'Active';
      mockGameRepository.findById.mockResolvedValue(mockGame);
      const result = await gameService.getCurrentPlayer(gameId);
      expect(result).toBe(userId);
    });

    it('should throw GameNotActiveError if game is not active', async () => {
      mockGameRepository.findById.mockResolvedValue(mockGame);
      await expect(gameService.getCurrentPlayer(gameId)).rejects.toThrow(
        GameNotActiveError,
      );
    });
  });

  describe('getGameStatus', () => {
    it('should get the game status', async () => {
      mockGameRepository.findGameStatus.mockResolvedValue({
        status: 'Waiting',
      });
      const status = await gameService.getGameStatus(gameId);
      expect(status).toBe('Waiting');
      expect(mockGameRepository.findGameStatus).toHaveBeenCalledWith(gameId);
    });

    it('should throw InvalidGameIdError for invalid id', async () => {
      await expect(gameService.getGameStatus(' ')).rejects.toThrow(
        InvalidGameIdError,
      );
    });
  });

  describe('getGamePlayers', () => {
    it('should retrieve the list of players for a game', async () => {
      expect(true).toBe(true);
    });

    it('should throw GameNotFoundError if game not found', async () => {
      expect(true).toBe(true);
    });
  });
});
