import { CardActionStrategy } from './card-action-strategy.js';

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
   * When a skip card is played, it clears any currentColor set by a previous Wild card
   * and advances the turn to skip the next player.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   */
  execute({ game }) {
    // Clear currentColor when a non-Wild card is played
    if (game.currentColor) {
      game.setCurrentColor(null);
    }
    game.advanceTurn();
  }
}

export { SkipStrategy };
