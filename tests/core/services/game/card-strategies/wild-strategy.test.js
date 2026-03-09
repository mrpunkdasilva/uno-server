import { WildStrategy } from '../../../../../src/core/services/game/card-strategies/wild-strategy.js';

describe('WildStrategy', () => {
  let strategy;
  let mockGame;

  beforeEach(() => {
    strategy = new WildStrategy();
    mockGame = {
      setCurrentColor: jest.fn(),
    };
  });

  it('should return true for valid colors in canExecute', () => {
    expect(strategy.canExecute({ chosenColor: 'red' })).toBe(true);
    expect(strategy.canExecute({ chosenColor: 'blue' })).toBe(true);
    expect(strategy.canExecute({ chosenColor: 'green' })).toBe(true);
    expect(strategy.canExecute({ chosenColor: 'yellow' })).toBe(true);
  });

  it('should return false for invalid colors in canExecute', () => {
    expect(strategy.canExecute({ chosenColor: 'purple' })).toBe(false);
    expect(strategy.canExecute({ chosenColor: null })).toBe(false);
  });

  it('should set the chosen color in execute', () => {
    strategy.execute({ game: mockGame, chosenColor: 'blue' });
    expect(mockGame.setCurrentColor).toHaveBeenCalledWith('blue');
  });

  it('should throw error if invalid color is provided to execute', () => {
    expect(() => {
      strategy.execute({ game: mockGame, chosenColor: 'invalid' });
    }).toThrow('Invalid color chosen for Wild card.');
  });
});
