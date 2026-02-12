import { DrawTwoStrategy } from './DrawTwoStrategy.js';
import { NumberCardStrategy } from './NumberCardStrategy.js';
import { ReverseStrategy } from './ReverseStrategy.js';
import { SkipStrategy } from './SkipStrategy.js';
import { WildStrategy } from './WildStrategy.js';
import { WildDrawFourStrategy } from './WildDrawFourStrategy.js';

// The map now uses the 'value' property of a card (e.g., 'skip', 'reverse') as the key.
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
  // Return the specific strategy based on the card's value,
  // or the default NumberCardStrategy if no match is found.
  return strategyMap[card.value] || NumberCardStrategy;
};

export { getStrategyForCard };
