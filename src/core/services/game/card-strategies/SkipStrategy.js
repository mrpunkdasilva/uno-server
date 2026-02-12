import { CardActionStrategy } from './CardActionStrategy.js';

/**
 * @class SkipStrategy
 * @description Strategy for the 'Skip' card.
 * The core game loop will advance the turn once for the current player.
 * This strategy applies the card's *additional* effect, which is to
 * advance the turn one more time, effectively skipping the next player.
 */
class SkipStrategy extends CardActionStrategy {
  /**
   * Executes the skip action.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   */
  execute({ game }) {
    game.advanceTurn();
  }
}

export { SkipStrategy };
