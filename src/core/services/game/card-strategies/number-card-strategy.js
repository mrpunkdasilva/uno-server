import { CardActionStrategy } from './card-action-strategy.js';

/**
 * @class NumberCardStrategy
 * @description Strategy for cards that have no special action when played (e.g., number cards).
 * The card is simply played, and the turn progresses as normal.
 */
class NumberCardStrategy extends CardActionStrategy {
  /**
   * Executes the action. For a number card, there is no special action,
   * so this method does nothing. The game loop will handle turn advancement.
   * When a number card is played, it clears any currentColor set by a previous Wild card.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   */
  execute({ game }) {
    // Clear currentColor when a non-Wild card is played
    if (game.currentColor) {
      game.setCurrentColor(null);
    }
  }
}

export { NumberCardStrategy };
