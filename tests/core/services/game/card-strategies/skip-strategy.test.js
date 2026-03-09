import { SkipStrategy } from '../../../../../src/core/services/game/card-strategies/skip-strategy.js';

describe('SkipStrategy', () => {
  let strategy;
  let mockGame;

  beforeEach(() => {
    strategy = new SkipStrategy();

    mockGame = {
      currentColor: 'blue',
      players: [
        { id: 'player1', username: 'user1' },
        { id: 'player2', username: 'user2' },
        { id: 'player3', username: 'user3' },
      ],
      currentPlayerIndex: 0,
      setCurrentColor: jest.fn(function (color) {
        this.currentColor = color;
      }),
      advanceTurn: jest.fn(function () {
        this.currentPlayerIndex =
          (this.currentPlayerIndex + 1) % this.players.length;
      }),
      lastAction: null,
    };
  });

  it('should return true for canExecute', () => {
    expect(strategy.canExecute()).toBe(true);
  });

  it('should clear currentColor if it is set', () => {
    strategy.execute({ game: mockGame });
    expect(mockGame.setCurrentColor).toHaveBeenCalledWith(null);
    expect(mockGame.currentColor).toBe(null);
  });

  it('should advance the turn once (total of two including game loop)', () => {
    strategy.execute({ game: mockGame });
    expect(mockGame.advanceTurn).toHaveBeenCalledTimes(1);
    expect(mockGame.currentPlayerIndex).toBe(1);
  });

  it('should set lastAction with skip information', () => {
    strategy.execute({ game: mockGame });
    expect(mockGame.lastAction).toEqual({
      type: 'SKIP',
      skippedPlayer: 'player2',
      skippedPlayerName: 'user2',
    });
  });
});
