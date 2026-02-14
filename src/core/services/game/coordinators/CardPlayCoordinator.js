import { getStrategyForCard } from '../card-strategies/strategy.factory.js';
import {
  applyCardPlayEffects,
  checkWinConditionAndGetOutcome,
  buildPlayCardSuccessMessage,
} from '../../../domain/game/game.logic.js';
import { CannotPerformActionError } from '../../../errors/game.errors.js';
import { Result } from '../../../utils/Result.js';

/**
 * Coordinates the complex process of playing a card, including strategy execution,
 * game state updates, win condition checks, and persistence.
 * This class serves as a specialized service component to keep the main GameService leaner.
 */
export class CardPlayCoordinator {
  /**
   * Initializes the CardPlayCoordinator.
   * @param {object} gameService - The GameService instance, providing access to necessary dependencies.
   */
  constructor(gameService) {
    this.gameService = gameService;
  }

  /**
   * Orchestrates the card play process for a player.
   * @param {object} game - The game object.
   * @param {string} gameId - The ID of the game being played.
   * @param {string} playerId - The ID of the player making the move.
   * @param {object} currentPlayer - The current player object.
   * @param {number} cardIndex - The index of the card in the player's hand.
   * @param {object} cardToPlay - The card being played.
   * @param {string|null} chosenColor - The color chosen by the player for wild cards.
   * @returns {Promise<Result<object, Error>>} A Result indicating success or an error.
   */
  async execute(
    game,
    gameId,
    playerId,
    currentPlayer,
    cardIndex,
    cardToPlay,
    chosenColor,
  ) {
    const StrategyClass = getStrategyForCard(cardToPlay);
    const strategy = new StrategyClass();
    const gameContext = { game, card: cardToPlay, chosenColor };

    if (!strategy.canExecute(gameContext)) {
      return Result.failure(
        new CannotPerformActionError(
          'Invalid action for this card (e.g., missing color for Wild).',
        ),
      );
    }

    strategy.execute(gameContext);

    applyCardPlayEffects(game, currentPlayer, cardIndex, cardToPlay);

    const { action, winnerId } = checkWinConditionAndGetOutcome(
      game,
      currentPlayer,
    );

    await this.gameService.postPlayOutcomeExecutor.execute(action, {
      game,
      gameId,
      winnerId,
    });

    return Result.success({
      success: true,
      message: buildPlayCardSuccessMessage(action),
    });
  }
}
