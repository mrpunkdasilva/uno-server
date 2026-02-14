import { PostPlayAction } from '../../../enums/game.enum.js';
import logger from '../../../../config/logger.js';

export class PostPlayOutcomeExecutor {
  constructor(gameService) {
    this.gameService = gameService;

    this.strategies = {
      [PostPlayAction.END_GAME_WITH_WINNER]: this._endGameWithWinner.bind(this),
      [PostPlayAction.CONTINUE_GAME]: this._continueGame.bind(this),
    };
  }

  async execute(action, context) {
    const strategy = this.strategies[action];
    if (strategy) {
      await strategy(context);
    } else {
      logger.error(`Unknown post-play action: ${action}`);
      throw new Error(`Unknown post-play action: ${action}`);
    }
  }

  async _endGameWithWinner({ gameId, winnerId }) {
    await this.gameService._endGame(gameId, winnerId);
    logger.info(`Player ${winnerId} has won game ${gameId}!`);
  }

  async _continueGame({ game }) {
    await this.gameService.gameRepository.save(game);
  }
}
