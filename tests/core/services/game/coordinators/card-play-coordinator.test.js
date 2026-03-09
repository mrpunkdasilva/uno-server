import { CardPlayCoordinator } from '../../../../../src/core/services/game/coordinators/card-play-coordinator.js';
import * as GameLogic from '../../../../../src/core/domain/game/game.logic.js';
import * as StrategyFactory from '../../../../../src/core/services/game/card-strategies/strategy.factory.js';
import * as SkipUtils from '../../../../../src/core/utils/skip.utils.js';

// Mocks
jest.mock('../../../../../src/core/domain/game/game.logic.js');
jest.mock(
  '../../../../../src/core/services/game/card-strategies/strategy.factory.js',
);
jest.mock('../../../../../src/core/utils/skip.utils.js');

describe('CardPlayCoordinator', () => {
  let coordinator;
  let mockGameService;
  let mockLogger;
  let mockGame;
  let mockStrategy;

  beforeEach(() => {
    mockGameService = {
      postPlayOutcomeExecutor: {
        execute: jest.fn().mockResolvedValue(),
      },
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    coordinator = new CardPlayCoordinator(mockGameService, mockLogger);

    mockGame = {
      discardPile: [{ color: 'red', value: '5' }],
      currentColor: 'red',
      currentPlayerIndex: 0,
      direction: 1,
      players: [
        { id: 'p1', username: 'Player 1' },
        { id: 'p2', username: 'Player 2' },
      ],
    };

    mockStrategy = {
      canExecute: jest.fn().mockReturnValue(true),
      execute: jest.fn(),
    };

    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    StrategyFactory.getStrategyForCard.mockReturnValue(
      jest.fn(() => mockStrategy),
    );
    GameLogic.isValidCardPlay.mockReturnValue(true);
    GameLogic.checkWinConditionAndGetOutcome.mockReturnValue({
      action: 'CONTINUE',
      winnerId: null,
    });
    GameLogic.buildPlayCardSuccessMessage.mockReturnValue(
      'Card played successfully',
    );
    SkipUtils.calculateSkipResult.mockReturnValue({
      skippedPlayer: 'Player 2',
      nextPlayer: 'Player 1',
    });
  });

  it('should initialize correctly', () => {
    expect(coordinator.gameService).toBe(mockGameService);
    expect(coordinator.logger).toBe(mockLogger);
  });

  it('should return failure if card play is invalid', async () => {
    GameLogic.isValidCardPlay.mockReturnValue(false);

    const result = await coordinator.execute(
      mockGame,
      'game-1',
      'p1',
      { id: 'p1', hand: [] },
      0,
      { color: 'blue', value: '5' },
      null,
    );

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain('Invalid card');
    expect(GameLogic.isValidCardPlay).toHaveBeenCalled();
  });

  it('should return failure if strategy cannot execute', async () => {
    mockStrategy.canExecute.mockReturnValue(false);

    const result = await coordinator.execute(
      mockGame,
      'game-1',
      'p1',
      { id: 'p1', hand: [] },
      0,
      { color: 'blue', value: '5' },
      null,
    );

    expect(result.isFailure).toBe(true);
    expect(result.error.message).toContain('Invalid action for this card');
    expect(mockStrategy.canExecute).toHaveBeenCalled();
  });

  it('should execute strategy and apply card effects on valid play', async () => {
    const cardToPlay = { color: 'red', value: '5' };
    const currentPlayer = {
      id: 'p1',
      hand: [cardToPlay, { color: 'red', value: '6' }],
    };

    const result = await coordinator.execute(
      mockGame,
      'game-1',
      'p1',
      currentPlayer,
      0,
      cardToPlay,
      null,
    );

    expect(result.isSuccess).toBe(true);
    expect(mockStrategy.execute).toHaveBeenCalled();
    expect(GameLogic.applyCardPlayEffects).toHaveBeenCalledWith(
      mockGame,
      currentPlayer,
      0,
      cardToPlay,
    );
    expect(GameLogic.checkWinConditionAndGetOutcome).toHaveBeenCalled();
    expect(mockGameService.postPlayOutcomeExecutor.execute).toHaveBeenCalled();
  });

  it('should reset hasDeclaredUno if player still has cards', async () => {
    const cardToPlay = { color: 'red', value: '5' };
    const currentPlayer = {
      id: 'p1',
      hand: [cardToPlay, { color: 'red', value: '6' }], // Will have 1 card left after play logic mock?
      // Note: applyCardPlayEffects is mocked, so we simulate the check logic based on the coordinator code
      // The coordinator checks: if (currentPlayer.hand && currentPlayer.hand.length !== 1)
      // Wait, applyCardPlayEffects usually removes the card. Since it's mocked, the hand length won't change unless we change it.
      hasDeclaredUno: true,
    };

    // Mock applyCardPlayEffects to simulate card removal?
    // The coordinator calls applyCardPlayEffects BEFORE checking hand length.
    // But since it's mocked, the array won't change.
    // So if we pass 2 cards, length is 2 != 1, so hasDeclaredUno should be set to false.

    await coordinator.execute(
      mockGame,
      'game-1',
      'p1',
      currentPlayer,
      0,
      cardToPlay,
      null,
    );

    expect(currentPlayer.hasDeclaredUno).toBe(false);
  });

  it('should NOT reset hasDeclaredUno if player has exactly 1 card left (UNO state)', async () => {
    // We need to simulate that after playing, the player has 1 card.
    // Since applyCardPlayEffects is mocked, we can just pass a player with 1 card initially
    // IF the code checks the length directly.
    // The code:
    // GameDomain.applyCardPlayEffects(game, currentPlayer, cardIndex, cardToPlay);
    // if (currentPlayer.hand && currentPlayer.hand.length !== 1) { ... }

    // So if we pass a hand with 1 card, it shouldn't reset.
    const currentPlayer = {
      id: 'p1',
      hand: [{ color: 'red', value: '7' }],
      hasDeclaredUno: true,
    };

    await coordinator.execute(
      mockGame,
      'game-1',
      'p1',
      currentPlayer,
      0,
      { color: 'red', value: '5' },
      null,
    );

    expect(currentPlayer.hasDeclaredUno).toBe(true);
  });

  it('should handle skip cards correctly', async () => {
    const skipCard = { color: 'red', value: 'skip', type: 'skip' };

    const result = await coordinator.execute(
      mockGame,
      'game-1',
      'p1',
      { id: 'p1', hand: [] },
      0,
      skipCard,
      null,
    );

    expect(result.isSuccess).toBe(true);
    expect(SkipUtils.calculateSkipResult).toHaveBeenCalled();
    expect(result.value.skipInfo).toBeDefined();
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Skip card played'),
    );
  });
});
