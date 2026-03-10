import { DrawTwoStrategy } from '../../../../../src/core/services/game/card-strategies/draw-two-strategy.js';

describe('DrawTwoStrategy', () => {
  let strategy;
  let mockGame;

  beforeEach(() => {
    strategy = new DrawTwoStrategy();

    mockGame = {
      currentColor: 'green',
      players: [{ _id: 'p1' }, { _id: 'p2' }],
      setCurrentColor: jest.fn(function (c) {
        this.currentColor = c;
      }),
      getNextPlayer: jest.fn().mockReturnValue({ _id: 'p2' }),
      drawCards: jest.fn().mockReturnValue(['card1', 'card2']),
      addCardsToPlayerHand: jest.fn(),
      advanceTurn: jest.fn(),
    };
  });

  it('should clear currentColor and make next player draw 2 cards and skip their turn', () => {
    strategy.execute({ game: mockGame });

    expect(mockGame.setCurrentColor).toHaveBeenCalledWith(null);
    expect(mockGame.getNextPlayer).toHaveBeenCalled();
    expect(mockGame.drawCards).toHaveBeenCalledWith(2);
    expect(mockGame.addCardsToPlayerHand).toHaveBeenCalledWith('p2', [
      'card1',
      'card2',
    ]);
    expect(mockGame.advanceTurn).toHaveBeenCalled();
  });
});
