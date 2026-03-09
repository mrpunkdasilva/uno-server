import { ReverseStrategy } from '../../../../../src/core/services/game/card-strategies/reverse-strategy.js';

describe('ReverseStrategy', () => {
  let strategy;
  let mockGame;

  beforeEach(() => {
    strategy = new ReverseStrategy();

    mockGame = {
      currentColor: 'blue',
      players: [{ id: 'player1' }, { id: 'player2' }, { id: 'player3' }],
      turnDirection: 1,
      setCurrentColor: jest.fn(function (color) {
        this.currentColor = color;
      }),
      reverseDirection: jest.fn(function () {
        this.turnDirection *= -1;
      }),
      advanceTurn: jest.fn(),
    };
  });

  it('should clear currentColor if it is set', () => {
    strategy.execute({ game: mockGame });
    expect(mockGame.setCurrentColor).toHaveBeenCalledWith(null);
    expect(mockGame.currentColor).toBe(null);
  });

  it('should reverse the direction of play using model method', () => {
    strategy.execute({ game: mockGame });
    expect(mockGame.reverseDirection).toHaveBeenCalled();
    expect(mockGame.turnDirection).toBe(-1);
  });

  it('should fallback to manual direction change if method not present', () => {
    delete mockGame.reverseDirection;
    strategy.execute({ game: mockGame });
    expect(mockGame.turnDirection).toBe(-1);
  });

  it('should act like a Skip in a 2-player game', () => {
    mockGame.players = [{ id: 'p1' }, { id: 'p2' }];
    strategy.execute({ game: mockGame });

    // In 2-player, it reverses AND advances turn (skipping the other player)
    expect(mockGame.reverseDirection).toHaveBeenCalled();
    expect(mockGame.advanceTurn).toHaveBeenCalled();
  });

  it('should fallback to domain logic advanceTurn in 2-player game', () => {
    mockGame.players = [{ id: 'p1' }, { id: 'p2' }];
    delete mockGame.advanceTurn;

    // Should not crash, uses fallback
    strategy.execute({ game: mockGame });
    expect(mockGame.reverseDirection).toHaveBeenCalled();
  });
});
