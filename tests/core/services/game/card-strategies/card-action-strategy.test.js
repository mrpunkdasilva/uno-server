import { CardActionStrategy } from '../../../../../src/core/services/game/card-strategies/card-action-strategy.js';

describe('CardActionStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new CardActionStrategy();
  });

  it('should return true for canExecute by default', () => {
    expect(strategy.canExecute()).toBe(true);
  });

  it('should throw error for execute if not implemented', () => {
    expect(() => {
      strategy.execute();
    }).toThrow('The "execute" method must be implemented by subclasses.');
  });
});
