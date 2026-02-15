import { CardActionStrategy } from './card-action-strategy.js';

/**
 * @class ReverseStrategy
 * @description Strategy for the 'Reverse' card. It reverses the direction of play.
 */
class ReverseStrategy extends CardActionStrategy {
  /**
   * Executes the reverse action.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   */
  execute({ game }) {
    game.reverseDirection();
  }
}

export { ReverseStrategy };
