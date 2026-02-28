import { ReverseStrategy } from '../../../../../src/core/services/game/card-strategies/reverse-strategy.js';
// import * as GameDomain from '../../../../../src/core/domain/game/game.logic.js';

describe('ReverseStrategy', () => {
  let strategy;
  let mockGame;

  beforeEach(() => {
    strategy = new ReverseStrategy();

    // Mocking the game object based on game.model.js structure
    mockGame = {
      currentColor: 'blue',
      turnDirection: 1,
      currentPlayerIndex: 0,
      players: [{ _id: 'player1' }, { _id: 'player2' }, { _id: 'player3' }],
      setCurrentColor: jest.fn(function (color) {
        this.currentColor = color;
      }),
      reverseDirection: jest.fn(function () {
        this.turnDirection *= -1;
      }),
      advanceTurn: jest.fn(function () {
        const numPlayers = this.players.length;
        this.currentPlayerIndex =
          (this.currentPlayerIndex + this.turnDirection + numPlayers) %
          numPlayers;
      }),
    };
  });

  it('should clear currentColor if it is set', () => {
    strategy.execute({ game: mockGame });

    expect(mockGame.setCurrentColor).toHaveBeenCalledWith(null);
    expect(mockGame.currentColor).toBe(null);
  });

  it('should reverse the turn direction from clockwise (1) to counter-clockwise (-1) in a 3+ player game', () => {
    strategy.execute({ game: mockGame });

    expect(mockGame.reverseDirection).toHaveBeenCalled();
    expect(mockGame.turnDirection).toBe(-1);

    // Should NOT act as a skip in a 3+ player game
    expect(mockGame.advanceTurn).not.toHaveBeenCalled();
  });

  it('should reverse the turn direction from counter-clockwise (-1) to clockwise (1) in a 3+ player game', () => {
    mockGame.turnDirection = -1; // Start counter-clockwise
    strategy.execute({ game: mockGame });

    expect(mockGame.reverseDirection).toHaveBeenCalled();
    expect(mockGame.turnDirection).toBe(1);
  });

  it('should act as a Skip card in a 2-player game by advancing the turn an extra time', () => {
    // Modify mock to be a 2-player game
    mockGame.players = [{ _id: 'player1' }, { _id: 'player2' }];

    strategy.execute({ game: mockGame });

    expect(mockGame.reverseDirection).toHaveBeenCalled();
    expect(mockGame.turnDirection).toBe(-1);

    // Should act as a skip
    expect(mockGame.advanceTurn).toHaveBeenCalledTimes(1);
  });
});
