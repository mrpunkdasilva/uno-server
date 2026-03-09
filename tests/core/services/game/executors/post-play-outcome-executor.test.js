import { PostPlayOutcomeExecutor } from '../../../../../src/core/services/game/executors/PostPlayOutcomeExecutor.js';
import { PostPlayAction } from '../../../../../src/core/enums/game.enum.js';

describe('PostPlayOutcomeExecutor', () => {
  let executor;
  let mockGameService;

  beforeEach(() => {
    mockGameService = {
      _endGame: jest.fn().mockResolvedValue(),
      gameRepository: {
        save: jest.fn().mockResolvedValue(),
      },
    };
    executor = new PostPlayOutcomeExecutor(mockGameService);
  });

  it('should execute END_GAME_WITH_WINNER action', async () => {
    const context = { gameId: 'g1', winnerId: 'w1' };
    await executor.execute(PostPlayAction.END_GAME_WITH_WINNER, context);

    expect(mockGameService._endGame).toHaveBeenCalledWith('g1', 'w1');
  });

  it('should execute CONTINUE_GAME action', async () => {
    const mockGame = { id: 'g1' };
    const context = { game: mockGame };
    await executor.execute(PostPlayAction.CONTINUE_GAME, context);

    expect(mockGameService.gameRepository.save).toHaveBeenCalledWith(mockGame);
  });

  it('should throw error for unknown action', async () => {
    await expect(executor.execute('INVALID_ACTION', {})).rejects.toThrow(
      'Unknown post-play action: INVALID_ACTION',
    );
  });
});
