import { getStrategyForCard } from '../card-strategies/strategy.factory.js';
import * as GameDomain from '../../../domain/game/index.js';
import * as GameErrors from '../../../errors/index.js';
import * as CommonUtils from '../../../utils/index.js';
import { isValidCardPlay } from '../../../domain/game/game.logic.js';
import { calculateSkipResult } from '../../../utils/skip.utils.js';

/**
 * Coordinates the complex process of playing a card, including strategy execution,
 * game state updates, win condition checks, and persistence.
 * This class serves as a specialized service component to keep the main GameService leaner.
 */
export class CardPlayCoordinator {
  /**
   * Initializes the CardPlayer ${playerId} playing card ${cardToPlay.id} in game ${gameId}.
   * @param {object} gameService - The GameService instance, providing access to necessary dependencies.
   * @param {object} logger - The logger instance.
   */
  constructor(gameService, logger) {
    this.gameService = gameService;
    this.logger = logger;
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
    this.logger.info(
      `CardPlayCoordinator: Player ${playerId} playing card ${cardToPlay.id} in game ${gameId}.`,
    );

    // VALIDATE CARD PLAY FIRST (before modifying game state)
    const topCard = game.discardPile[game.discardPile.length - 1];

    if (!isValidCardPlay(topCard, cardToPlay, game.currentColor)) {
      return CommonUtils.Result.failure(
        new GameErrors.CannotPerformActionError(
          'Invalid card. You must match color, value or type.',
        ),
      );
    }

    // Store current player index and direction before strategy execution
    // to calculate skip information if needed
    const currentPlayerIndex = game.currentPlayerIndex;
    const currentDirection = game.direction;

    // Now execute the card strategy
    const StrategyClass = getStrategyForCard(cardToPlay);
    const strategy = new StrategyClass();
    const gameContext = { game, card: cardToPlay, chosenColor };

    if (!strategy.canExecute(gameContext)) {
      return CommonUtils.Result.failure(
        new GameErrors.CannotPerformActionError(
          'Invalid action for this card (e.g., missing color for Wild).',
        ),
      );
    }

    strategy.execute(gameContext);

    GameDomain.applyCardPlayEffects(game, currentPlayer, cardIndex, cardToPlay);

    // reset their UNO declaration status to prevent false safety.
    if (currentPlayer.hand && currentPlayer.hand.length !== 1) {
      currentPlayer.hasDeclaredUno = false;
    }

    const { action, winnerId } = GameDomain.checkWinConditionAndGetOutcome(
      game,
      currentPlayer,
    );

    await this.gameService.postPlayOutcomeExecutor.execute(action, {
      game,
      gameId,
      winnerId,
    });

    // Prepare success response
    const successResponse = {
      success: true,
      message: GameDomain.buildPlayCardSuccessMessage(action),
    };

    // If this was a skip card, add skip information to the response
    if (cardToPlay.value === 'skip' || cardToPlay.type === 'skip') {
      // Get player names for better response formatting
      const players = game.players.map((p) => p.username || p.id);

      const skipResult = calculateSkipResult(
        currentPlayerIndex,
        players,
        currentDirection,
      );

      // Add skip info to the response
      successResponse.skipInfo = skipResult;

      this.logger.info(
        `Skip card played: Skipped player ${skipResult.skippedPlayer}, next player is ${skipResult.nextPlayer}`,
      );
    }

    return CommonUtils.Result.success(successResponse);
  }
}
