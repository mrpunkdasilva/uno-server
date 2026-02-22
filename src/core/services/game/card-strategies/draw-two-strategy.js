import { CardActionStrategy } from './card-action-strategy.js';

/**
 * @class DrawTwoStrategy
 * @description Strategy for the 'Draw Two' card. The next player draws two cards
 * and their turn is skipped.
 */
class DrawTwoStrategy extends CardActionStrategy {
  /**
   * Executes the draw two action.
   * When a draw two card is played, it clears any currentColor set by a previous Wild card,
   * makes the next player draw two cards, and skips their turn.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   */
  execute({ game }) {
    // Clear currentColor when a non-Wild card is played
    if (game.currentColor) {
      game.setCurrentColor(null);
    }

    const nextPlayer = game.getNextPlayer();
    const cardsToDraw = game.drawCards(2);

    nextPlayer.addCardsToHand(cardsToDraw);

    // The turn is advanced an extra time to skip the player who just drew cards.
    game.advanceTurn();
  }
}

export { DrawTwoStrategy };
