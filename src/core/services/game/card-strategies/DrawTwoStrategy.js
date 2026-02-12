import { CardActionStrategy } from './CardActionStrategy.js';

/**
 * @class DrawTwoStrategy
 * @description Strategy for the 'Draw Two' card. The next player draws two cards
 * and their turn is skipped.
 */
class DrawTwoStrategy extends CardActionStrategy {
  /**
   * Executes the draw two action.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   */
  execute({ game }) {
    const nextPlayer = game.getNextPlayer();
    const cardsToDraw = game.drawCards(2);

    nextPlayer.addCardsToHand(cardsToDraw);

    // The turn is advanced an extra time to skip the player who just drew cards.
    game.advanceTurn();
  }
}

export { DrawTwoStrategy };
