import { CardActionStrategy } from './CardActionStrategy.js';

/**
 * @class WildStrategy
 * @description Strategy for the 'Wild' card. It allows the player to change the
 * active color of the game.
 */
class WildStrategy extends CardActionStrategy {
  /**
   * Validates that a valid color was chosen.
   * @param {object} gameContext - The context of the game.
   * @param {string} gameContext.chosenColor - The color chosen by the player.
   * @returns {boolean}
   */
  canExecute({ chosenColor }) {
    const validColors = ['red', 'yellow', 'green', 'blue'];
    return validColors.includes(chosenColor);
  }

  /**
   * Executes the wild card action.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   * @param {string} gameContext.chosenColor - The color chosen by the player.
   */
  execute({ game, chosenColor }) {
    if (!this.canExecute({ chosenColor })) {
      // This should be caught by a validation layer before calling the service,
      // but we add it for robustness.
      throw new Error('Invalid color chosen for Wild card.');
    }
    game.setCurrentColor(chosenColor);
  }
}

export { WildStrategy };
