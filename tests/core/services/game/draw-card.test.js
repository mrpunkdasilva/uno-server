import GameService from '../../../../src/core/services/game/game.service.js';
import {
  CannotPerformActionError,
  GameNotActiveError,
} from '../../../../src/core/errors/game.errors.js';
import { mockGameRepository } from '../../../../src/mocks/game.mocks.js';
import { mockPlayerRepository } from '../../../../src/mocks/player.mocks.js';

describe('GameService - drawCard', () => {
  let gameService;
  const userId = 'user-1';
  const gameId = '65f1a2b3c4d5e6f7a8b9c0d1'; // Valid ObjectId format
  let mockGame;

  beforeEach(() => {
    jest.clearAllMocks();
    gameService = new GameService(mockGameRepository, mockPlayerRepository);

    mockGame = {
      _id: gameId,
      status: 'Active',
      players: [
        { _id: userId, hand: [{ color: 'red', value: '1', type: 'number' }] },
        { _id: 'user-2', hand: [] },
      ],
      currentPlayerIndex: 0,
      discardPile: [{ color: 'blue', value: '2', type: 'number' }],
      deck: [{ color: 'green', value: 'reverse', type: 'action' }],
      save: jest.fn().mockResolvedValue(true),
    };

    mockGameRepository.findById.mockResolvedValue(mockGame);
    mockGameRepository.save.mockResolvedValue(mockGame);
  });

  it('should draw a card if the player has no playable cards', async () => {
    // Current player (user-1) has Red 1, Top card is Blue 2. No match.
    const result = await gameService.drawCard(userId, gameId, userId);

    expect(result.message).toBe(`${userId} drew a card from the deck.`);
    expect(result.cardDrawn).toBe('Green Reverse');
    expect(mockGame.players[0].hand).toHaveLength(2);
    expect(mockGame.deck).toHaveLength(0);
    expect(mockGameRepository.save).toHaveBeenCalled();
  });

  it('should throw CannotPerformActionError if the player has playable cards', async () => {
    // Current player has Red 1, Top card is Red 2. Match!
    mockGame.discardPile = [{ color: 'red', value: '2', type: 'number' }];

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      CannotPerformActionError,
    );
    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      'You have playable cards. You cannot draw from the deck.',
    );
  });

  it('should throw CannotPerformActionError if it is not the players turn', async () => {
    mockGame.currentPlayerIndex = 1; // It's user-2's turn

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      CannotPerformActionError,
    );
  });

  it('should throw error if user does not match playerId', async () => {
    await expect(
      gameService.drawCard(userId, gameId, 'user-2'),
    ).rejects.toThrow('You can only view your own cards');
  });

  it('should throw GameNotActiveError if game is not active', async () => {
    mockGame.status = 'Waiting';

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      GameNotActiveError,
    );
  });

  it('should throw CannotPerformActionError if deck is empty', async () => {
    mockGame.deck = [];

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      CannotPerformActionError,
    );
    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      'The deck is empty.',
    );
  });
});
