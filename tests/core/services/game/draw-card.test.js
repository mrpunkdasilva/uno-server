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
  const gameId = '65f1a2b3c4d5e6f7a8b9c0d1';

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
  });

  it('should draw a card if the player has no playable cards', async () => {
    /**
     * CHANGE:
     * The new rule draws until a playable card is found.
     * In this case:
     * - Player has Red 1
     * - Top card is Blue 2
     * - Green Reverse does NOT match color or value
     * So the player draws it, but it is NOT playable.
     */

    const result = await gameService.drawCard(userId, gameId, userId);

    // CHANGE:
    // Updated message to match new service return
    expect(result.message).toBe('No playable card found.');

    // CHANGE:
    // Now we compare OBJECT instead of formatted string
    expect(result.cardDrawn).toEqual({
      color: 'green',
      value: 'reverse',
      type: 'action',
    });

    // Player should now have 2 cards
    expect(mockGame.players[0].hand).toHaveLength(2);

    // Deck should now be empty
    expect(mockGame.deck).toHaveLength(0);

    expect(mockGame.save).toHaveBeenCalled();
  });

  it('should throw CannotPerformActionError if the player has playable cards', async () => {
    /**
     * CHANGE:
     * Now top card matches color (red),
     * so player already has playable card and cannot draw.
     */
    mockGame.discardPile = [{ color: 'red', value: '2', type: 'number' }];

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      CannotPerformActionError,
    );

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      'You have playable cards. You cannot draw from the deck.',
    );
  });

  it('should throw CannotPerformActionError if it is not the players turn', async () => {
    /**
     * No change here.
     * Just validating turn logic.
     */
    mockGame.currentPlayerIndex = 1;

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      CannotPerformActionError,
    );
  });

  it('should throw error if user does not match playerId', async () => {
    /**
     * No change.
     * Validates that user cannot act for another player.
     */
    await expect(
      gameService.drawCard(userId, gameId, 'user-2'),
    ).rejects.toThrow('You can only view your own cards');
  });

  it('should throw GameNotActiveError if game is not active', async () => {
    /**
     * No change.
     * Game must be Active to allow draw.
     */
    mockGame.status = 'Waiting';

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      GameNotActiveError,
    );
  });

  it('should throw CannotPerformActionError if deck is empty', async () => {
    /**
     * No change.
     * Player cannot draw if deck is empty.
     */
    mockGame.deck = [];

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      CannotPerformActionError,
    );

    await expect(gameService.drawCard(userId, gameId, userId)).rejects.toThrow(
      'The deck is empty.',
    );
  });
});
