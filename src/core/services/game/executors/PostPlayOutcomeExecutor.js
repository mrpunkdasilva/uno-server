import { PostPlayAction } from '../../../enums/game.enum.js';
import logger from '../../../../config/logger.js';

/**
 *
 */
export class PostPlayOutcomeExecutor {
  /**
   *
   * @param gameService
   */
  constructor(gameService) {
    this.gameService = gameService;

    this.strategies = {
      [PostPlayAction.END_GAME_WITH_WINNER]: this._endGameWithWinner.bind(this),
      [PostPlayAction.CONTINUE_GAME]: this._continueGame.bind(this),
    };
  }

  /**
   *
   * @param action
   * @param context
   */
  async execute(action, context) {
    const strategy = this.strategies[action];
    if (strategy) {
      await strategy(context);
    } else {
      logger.error(`Unknown post-play action: ${action}`);
      throw new Error(`Unknown post-play action: ${action}`);
    }
  }

  /**
   *
   * @param root0
   * @param root0.gameId
   * @param root0.winnerId
   */
  async _endGameWithWinner({ gameId, winnerId }) {
    await this.gameService._endGame(gameId, winnerId);
    logger.info(`Player ${winnerId} has won game ${gameId}!`);
  }

  /**
   *
   * @param root0
   * @param root0.game
   */
  async _continueGame({ game }) {
    await this.gameService.gameRepository.save(game);
  }
}
