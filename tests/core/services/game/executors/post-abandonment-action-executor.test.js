import { PostAbandonmentActionExecutor } from '../../../../../src/core/services/game/executors/PostAbandonmentActionExecutor.js';
import { PostAbandonmentAction } from '../../../../../src/core/enums/game.enum.js';

describe('PostAbandonmentActionExecutor', () => {
  let executor;
  let mockGameService;

  beforeEach(() => {
    mockGameService = {
      _endGame: jest.fn().mockResolvedValue(),
      gameRepository: {
        save: jest.fn().mockResolvedValue(),
      },
    };
    executor = new PostAbandonmentActionExecutor(mockGameService);
  });

  it('should execute END_GAME_WITH_WINNER action', async () => {
    const context = { gameId: 'g1', winnerId: 'w1' };
    await executor.execute(PostAbandonmentAction.END_GAME_WITH_WINNER, context);

    expect(mockGameService._endGame).toHaveBeenCalledWith('g1', 'w1');
  });

  it('should execute END_GAME_NO_WINNER action', async () => {
    const context = { gameId: 'g1' };
    await executor.execute(PostAbandonmentAction.END_GAME_NO_WINNER, context);

    expect(mockGameService._endGame).toHaveBeenCalledWith('g1', null);
  });

  it('should execute SAVE_GAME action', async () => {
    const mockGame = { id: 'g1' };
    const context = { game: mockGame };
    await executor.execute(PostAbandonmentAction.SAVE_GAME, context);

    expect(mockGameService.gameRepository.save).toHaveBeenCalledWith(mockGame);
  });

  it('should throw error for unknown action', async () => {
    await expect(executor.execute('INVALID_ACTION', {})).rejects.toThrow(
      'Unknown post-abandonment action: INVALID_ACTION',
    );
  });
});
