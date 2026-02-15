import { PostAbandonmentAction } from '../../../enums/game.enum.js';
import logger from '../../../../config/logger.js';

/**
 * Executes post-abandonment actions based on the outcome determined by domain logic.
 * This class encapsulates the persistence-related logic for handling game abandonment.
 */
export class PostAbandonmentActionExecutor {
  /**
   * Initializes the PostAbandonmentActionExecutor with a GameService instance.
   * @param {object} gameService - The instance of GameService to interact with.
   */
  constructor(gameService) {
    this.gameService = gameService;

    this.strategies = {
      [PostAbandonmentAction.END_GAME_WITH_WINNER]:
        this._endGameWithWinner.bind(this),
      [PostAbandonmentAction.END_GAME_NO_WINNER]:
        this._endGameNoWinner.bind(this),
      [PostAbandonmentAction.SAVE_GAME]: this._saveGame.bind(this),
    };
  }

  /**
   * Executes the appropriate persistence action based on the post-abandonment action.
   * @param {string} action - The action to perform, derived from PostAbandonmentAction enum.
   * @param {PostAbandonmentContext} context - The context containing game data and identifiers.
   * @throws {Error} If an unknown post-abandonment action is provided.
   */
  async execute(action, context) {
    const strategy = this.strategies[action];
    if (strategy) {
      await strategy(context);
    } else {
      logger.error(`Unknown post-abandonment action: ${action}`);
      throw new Error(`Unknown post-abandonment action: ${action}`);
    }
  }

  /**
   * Ends the game with a designated winner.
   * @private
   * @param {object} params - The parameters for ending the game.
   * @param {string} params.gameId - The ID of the game to end.
   * @param {string} params.winnerId - The ID of the player who won.
   */
  async _endGameWithWinner({ gameId, winnerId }) {
    await this.gameService._endGame(gameId, winnerId);
    logger.info(
      `Game ${gameId} ended due to last player (${winnerId}) remaining after abandonment.`,
    );
  }

  /**
   * Ends the game with no specific winner (e.g., all players abandoned).
   * @private
   * @param {object} params - The parameters for ending the game.
   * @param {string} params.gameId - The ID of the game to end.
   */
  async _endGameNoWinner({ gameId }) {
    await this.gameService._endGame(gameId, null);
    logger.info(`Game ${gameId} ended as all players abandoned.`);
  }

  /**
   * Saves the current state of the game.
   * @private
   * @param {object} params - The parameters for saving the game.
   * @param {object} params.game - The game object to save.
   */
  async _saveGame({ game }) {
    await this.gameService.gameRepository.save(game);
  }
}
