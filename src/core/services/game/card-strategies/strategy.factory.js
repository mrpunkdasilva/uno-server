import { DrawTwoStrategy } from './draw-two-strategy.js';
import { NumberCardStrategy } from './number-card-strategy.js';
import { ReverseStrategy } from './reverse-strategy.js';
import { SkipStrategy } from './skip-strategy.js';
import { WildStrategy } from './wild-strategy.js';
import { WildDrawFourStrategy } from './wild-draw-four-strategy.js';

const strategyMap = {
  skip: SkipStrategy,
  reverse: ReverseStrategy,
  draw_two: DrawTwoStrategy,
  wild: WildStrategy,
  wild_draw4: WildDrawFourStrategy,
};

/**
 * Gets the strategy class for a given card.
 * @param {Card} card - The card for which to find the strategy.
 * @returns {typeof CardActionStrategy} A reference to the strategy class constructor.
 */
const getStrategyForCard = (card) => {
  return strategyMap[card.value] || NumberCardStrategy;
};

export { getStrategyForCard };
