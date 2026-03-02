import { CardActionStrategy } from './card-action-strategy.js';
import { advanceTurn } from '../../../domain/game/game.logic.js';

/**
 * @class ReverseStrategy
 * @description Strategy for the 'Reverse' card. It reverses the direction of play.
 */
class ReverseStrategy extends CardActionStrategy {
  /**
   * Executes the reverse action.
   * When a reverse card is played, it clears any currentColor set by a previous Wild card
   * and reverses the direction of play.
   * * Official UNO Rule: If there are only 2 players, the Reverse card acts like a Skip.
   * * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   * @param root0
   * @param root0.game
   */
  execute({ game }) {
    // Clear currentColor when a non-Wild card is played
    if (game.currentColor) {
      game.setCurrentColor(null);
    }

    // Reverse the direction of play (calls the Mongoose model method)
    if (typeof game.reverseDirection === 'function') {
      game.reverseDirection();
    } else {
      game.turnDirection *= -1; // Fallback
    }

    // Edge Case: In a 2-player game, a Reverse card immediately skips the other player.
    // We achieve this by advancing the turn an extra time during strategy execution.
    // When the controller advances the turn again, it will land back on the player who threw the card.
    if (game.players && game.players.length === 2) {
      if (typeof game.advanceTurn === 'function') {
        game.advanceTurn();
      } else {
        advanceTurn(game); // Fallback to domain logic
      }
    }
  }
}

export { ReverseStrategy };
