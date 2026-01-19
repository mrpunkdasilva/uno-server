import PlayerService from '../player.service.js';
import PlayerRepository from '../../../infra/repositories/player.repository.js';

jest.mock('../../../infra/repositories/player.repository.js');

describe('PlayerService', () => {
  let playerService;
  let playerRepositoryInstance;

  beforeEach(() => {
    PlayerRepository.mockClear();
    playerRepositoryInstance = new PlayerRepository();
    playerService = new PlayerService(playerRepositoryInstance);
  });

  it('should be defined', () => {
    expect(playerService).toBeDefined();
  });

  it('should create a player', async () => {
    const playerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    const createdPlayer = {
      ...playerData,
      _id: 'some-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      toObject: () => ({
        ...playerData,
        _id: 'some-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    playerRepositoryInstance.findByEmail.mockResolvedValue(null);
    playerRepositoryInstance.findByUsername.mockResolvedValue(null);
    playerRepositoryInstance.create.mockResolvedValue(createdPlayer);

    const result = await playerService.createPlayer(playerData);

    expect(result).toBeDefined();
    expect(result.id).toBe('some-id');
    expect(result.username).toBe(playerData.username);
    expect(playerRepositoryInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
      }),
    );
  });
});
