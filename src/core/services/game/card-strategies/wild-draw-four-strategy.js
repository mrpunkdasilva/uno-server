import { CardActionStrategy } from './card-action-strategy.js';
import { CardColor } from '../../../enums/card.enum.js';

/**
 * @class WildDrawFourStrategy
 * @description Strategy for the 'Wild Draw Four' card. It changes the color,
 * makes the next player draw four cards, and skips their turn.
 */
class WildDrawFourStrategy extends CardActionStrategy {
  /**
   * Validates that a valid color was chosen.
   * @param {object} gameContext - The context of the game.
   * @param {string} gameContext.chosenColor - The color chosen by the player.
   * @returns {boolean}
   */
  canExecute({ chosenColor }) {
    const validColors = [
      CardColor.RED,
      CardColor.YELLOW,
      CardColor.GREEN,
      CardColor.BLUE,
    ];
    return validColors.includes(chosenColor);
    // Note: The rule about whether the player *can* play this card (i.e., not having
    // another playable card) is typically handled at a higher level (e.g., in game.service)
    // as it involves a "challenge" mechanic.
  }

  /**
   * Executes the Wild Draw Four action.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   * @param {string} gameContext.chosenColor - The color chosen by the player.
   */
  execute({ game, chosenColor }) {
    if (!this.canExecute({ chosenColor })) {
      throw new Error('Invalid color chosen for Wild Draw Four card.');
    }

    // 1. Set the chosen color
    game.setCurrentColor(chosenColor);

    // 2. Make the next player draw four cards
    const nextPlayer = game.getNextPlayer();
    const cardsToDraw = game.drawCards(4);
    nextPlayer.addCardsToHand(cardsToDraw);

    // 3. Skip the next player's turn
    game.advanceTurn();
  }
}

export { WildDrawFourStrategy };
