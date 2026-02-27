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
   * Checks if the skip card can be executed
   * @param {object} gameContext - The context of the game
   * @returns {boolean} - Always true for skip cards (they can always be played if valid)
   */
  canExecute() {
    return true; // Skip cards are always executable once validated
  }

  /**
   * Executes the skip action.
   * When a skip card is played, it advances the turn twice:
   * - First advance (from game loop) + Second advance (from strategy) = Skip one player
   * @param {object} gameContext - The context of the game
   * @param {Game} gameContext.game - The current game state
   */
  execute({ game }) {
    // Clear any currentColor set by previous Wild cards
    if (game.currentColor) {
      game.setCurrentColor(null);
    }

    // Advance turn twice to skip the next player
    // First advance (already happens in game loop) + this advance = skip one player
    game.advanceTurn();

    // Log the skipped player for response purposes
    const skippedPlayerIndex = game.currentPlayerIndex;
    const skippedPlayer = game.players[skippedPlayerIndex];

    // You might want to store this information for the response
    game.lastAction = {
      type: 'SKIP',
      skippedPlayer: skippedPlayer.id,
      skippedPlayerName: skippedPlayer.username,
    };
  }
}

export { SkipStrategy };
