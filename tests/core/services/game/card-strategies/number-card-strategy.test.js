import { NumberCardStrategy } from '../../../../../src/core/services/game/card-strategies/number-card-strategy.js';

describe('NumberCardStrategy', () => {
  let strategy;
  let mockGame;

  beforeEach(() => {
    strategy = new NumberCardStrategy();
    mockGame = {
      currentColor: 'red',
      setCurrentColor: jest.fn(function (c) {
        this.currentColor = c;
      }),
    };
  });

  it('should clear currentColor if set', () => {
    strategy.execute({ game: mockGame });
    expect(mockGame.setCurrentColor).toHaveBeenCalledWith(null);
    expect(mockGame.currentColor).toBe(null);
  });

  it('should do nothing if currentColor is already null', () => {
    mockGame.currentColor = null;
    strategy.execute({ game: mockGame });
    expect(mockGame.setCurrentColor).not.toHaveBeenCalled();
  });
});
