import GameService from '../../../../src/core/services/game/game.service.js';
import { GameNotFoundError } from '../../../../src/core/errors/game.errors.js';
import { mockGameRepository } from '../../../../src/mocks/game.mocks.js';
import { mockPlayerRepository } from '../../../../src/mocks/player.mocks.js';

describe('GameService - getGameScores', () => {
  let gameService;
  const gameId = '65f1a2b3c4d5e6f7a8b9c0d1';

  beforeEach(() => {
    jest.clearAllMocks();
    gameService = new GameService(mockGameRepository, mockPlayerRepository);
  });

  it('should return correct scores for all players based on their hands', async () => {
    const mockGameWithPlayers = {
      _id: gameId,
      players: [
        {
          _id: { username: 'Player1' },
          hand: [
            { type: 'number', value: '5' }, // 5 points
            { type: 'action', value: 'skip' }, // 20 points
          ],
        },
        {
          _id: { username: 'Player2' },
          hand: [
            { type: 'number', value: '5' }, // 5 points
          ],
        },
        {
          _id: { username: 'Player3' },
          hand: [
            { type: 'wild', value: 'wild' }, // 50 points
          ],
        },
      ],
    };

    mockGameRepository.findGameWithPlayerNames.mockResolvedValue(
      mockGameWithPlayers,
    );

    const result = await gameService.getGameScores(gameId);

    expect(result.scores).toEqual({
      Player1: 25,
      Player2: 5,
      Player3: 50,
    });
  });

  it('should throw GameNotFoundError if game is not found', async () => {
    mockGameRepository.findGameWithPlayerNames.mockResolvedValue(null);

    await expect(gameService.getGameScores(gameId)).rejects.toThrow(
      GameNotFoundError,
    );
  });
});
