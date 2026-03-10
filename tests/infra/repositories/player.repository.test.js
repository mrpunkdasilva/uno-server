import PlayerRepository from '../../../src/infra/repositories/player.repository.js';
import Player from '../../../src/infra/models/player.model.js';

jest.mock('../../../src/infra/models/player.model.js');

describe('PlayerRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new PlayerRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all players', async () => {
      const mockPlayers = [{ username: 'user1' }, { username: 'user2' }];
      Player.find.mockResolvedValue(mockPlayers);

      const result = await repository.findAll();

      expect(Player.find).toHaveBeenCalled();
      expect(result).toEqual(mockPlayers);
    });
  });

  describe('create', () => {
    it('should create and save a new player', async () => {
      const playerData = { username: 'newuser', email: 'test@test.com' };
      const mockSave = jest
        .fn()
        .mockResolvedValue({ ...playerData, _id: 'id1' });

      Player.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await repository.create(playerData);

      expect(Player).toHaveBeenCalledWith(playerData);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual({ ...playerData, _id: 'id1' });
    });
  });

  describe('findById', () => {
    it('should return a player by ID', async () => {
      const mockPlayer = { _id: 'id1', username: 'user1' };
      Player.findById.mockResolvedValue(mockPlayer);

      const result = await repository.findById('id1');

      expect(Player.findById).toHaveBeenCalledWith('id1');
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('findByEmail', () => {
    it('should return a player by email', async () => {
      const mockPlayer = { _id: 'id1', email: 'test@test.com' };
      Player.findOne.mockResolvedValue(mockPlayer);

      const result = await repository.findByEmail('test@test.com');

      expect(Player.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('findByUsername', () => {
    it('should return a player by username', async () => {
      const mockPlayer = { _id: 'id1', username: 'user1' };
      Player.findOne.mockResolvedValue(mockPlayer);

      const result = await repository.findByUsername('user1');

      expect(Player.findOne).toHaveBeenCalledWith({ username: 'user1' });
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('update', () => {
    it('should update a player by ID', async () => {
      const updateData = { username: 'updated' };
      const mockUpdatedPlayer = { _id: 'id1', username: 'updated' };
      Player.findByIdAndUpdate.mockResolvedValue(mockUpdatedPlayer);

      const result = await repository.update('id1', updateData);

      expect(Player.findByIdAndUpdate).toHaveBeenCalledWith('id1', updateData, {
        new: true,
      });
      expect(result).toEqual(mockUpdatedPlayer);
    });
  });

  describe('delete', () => {
    it('should delete a player by ID', async () => {
      const mockDeletedPlayer = { _id: 'id1', username: 'user1' };
      Player.findByIdAndDelete.mockResolvedValue(mockDeletedPlayer);

      const result = await repository.delete('id1');

      expect(Player.findByIdAndDelete).toHaveBeenCalledWith('id1');
      expect(result).toEqual(mockDeletedPlayer);
    });
  });
});
