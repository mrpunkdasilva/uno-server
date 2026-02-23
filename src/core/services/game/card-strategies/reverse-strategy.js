import { CardActionStrategy } from './card-action-strategy.js';

/**
 * @class ReverseStrategy
 * @description Strategy for the 'Reverse' card. It reverses the direction of play.
 */
class ReverseStrategy extends CardActionStrategy {
  /**
   * Executes the reverse action.
   * When a reverse card is played, it clears any currentColor set by a previous Wild card
   * and reverses the direction of play.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   */
  execute({ game }) {
    // Clear currentColor when a non-Wild card is played
    if (game.currentColor) {
      game.setCurrentColor(null);
    }
    game.reverseDirection();
  }
}

export { ReverseStrategy };
