import { WildDrawFourStrategy } from '../../../../../src/core/services/game/card-strategies/wild-draw-four-strategy.js';
import { CardColor } from '../../../../../src/core/enums/card.enum.js';

describe('WildDrawFourStrategy', () => {
  let strategy;
  let mockGame;

  beforeEach(() => {
    strategy = new WildDrawFourStrategy();
    mockGame = {
      setCurrentColor: jest.fn(),
      getNextPlayer: jest.fn().mockReturnValue({ _id: 'pNext' }),
      drawCards: jest.fn().mockReturnValue(['c1', 'c2', 'c3', 'c4']),
      addCardsToPlayerHand: jest.fn(),
      advanceTurn: jest.fn(),
    };
  });

  it('should validate colors correctly', () => {
    expect(strategy.canExecute({ chosenColor: CardColor.RED })).toBe(true);
    expect(strategy.canExecute({ chosenColor: 'invalid' })).toBe(false);
  });

  it('should execute wild draw four actions', () => {
    strategy.execute({ game: mockGame, chosenColor: CardColor.RED });

    expect(mockGame.setCurrentColor).toHaveBeenCalledWith(CardColor.RED);
    expect(mockGame.getNextPlayer).toHaveBeenCalled();
    expect(mockGame.drawCards).toHaveBeenCalledWith(4);
    expect(mockGame.addCardsToPlayerHand).toHaveBeenCalledWith('pNext', [
      'c1',
      'c2',
      'c3',
      'c4',
    ]);
    expect(mockGame.advanceTurn).toHaveBeenCalled();
  });

  it('should throw error for invalid color', () => {
    expect(() => {
      strategy.execute({ game: mockGame, chosenColor: 'invalid' });
    }).toThrow('Invalid color chosen for Wild Draw Four card.');
  });
});
