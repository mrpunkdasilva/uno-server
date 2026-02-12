import { CardActionStrategy } from './CardActionStrategy.js';

/**
 * @class NumberCardStrategy
 * @description Strategy for cards that have no special action when played (e.g., number cards).
 * The card is simply played, and the turn progresses as normal.
 */
class NumberCardStrategy extends CardActionStrategy {
  /**
   * Executes the action. For a number card, there is no special action,
   * so this method does nothing. The game loop will handle turn advancement.
   * @param {object} gameContext - The context of the game.
   * @param _gameContext
   */
  execute() {
    // Renomeado para _gameContext
    // No special action to perform.
  }
}

export { NumberCardStrategy };
