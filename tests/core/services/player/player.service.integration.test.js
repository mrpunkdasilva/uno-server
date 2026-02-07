import mongoose from 'mongoose';
import PlayerService from '../../../../src/core/services/player.service.js';
import Player from '../../../../src/infra/models/player.model.js';

describe('PlayerService Integration Tests', () => {
  let playerService;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    playerService = new PlayerService();
  });

  afterEach(async () => {
    await Player.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new player in the database', async () => {
    const originalPassword = 'password123';
    const playerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: originalPassword,
    };

    const createdPlayer = await playerService.createPlayer(playerData);

    expect(createdPlayer).toBeDefined();
    expect(createdPlayer.username).toBe('testuser');
    expect(createdPlayer.email).toBe('test@example.com');
    expect(createdPlayer.id).toBeDefined();

    const dbPlayer = await Player.findById(createdPlayer.id);
    expect(dbPlayer).toBeDefined();
    expect(dbPlayer.username).toBe('testuser');
    expect(dbPlayer.email).toBe('test@example.com');
    expect(dbPlayer.password).not.toBe(originalPassword);
  });

  it('should retrieve a player by ID from the database', async () => {
    const created = await playerService.createPlayer({
      username: 'getmeuser',
      email: 'getme@example.com',
      password: 'password123',
    });

    const foundPlayer = await playerService.getPlayerById(created.id);

    expect(foundPlayer).toBeDefined();
    expect(foundPlayer.id).toBe(created.id);
    expect(foundPlayer.username).toBe(created.username);
    expect(foundPlayer.email).toBe(created.email);
  });

  it('should update a player in the database', async () => {
    const created = await playerService.createPlayer({
      username: 'updatemeuser',
      email: 'updateme@example.com',
      password: 'password123',
    });

    const updateData = { username: 'updatedUsername' };
    const updatedPlayer = await playerService.updatePlayer(
      created.id,
      updateData,
    );

    expect(updatedPlayer).toBeDefined();
    expect(updatedPlayer.id).toBe(created.id);
    expect(updatedPlayer.username).toBe(updateData.username);

    const dbPlayer = await Player.findById(created.id);
    expect(dbPlayer.username).toBe(updateData.username);
  });

  it('should delete a player from the database', async () => {
    const created = await playerService.createPlayer({
      username: 'deletemeuser',
      email: 'deleteme@example.com',
      password: 'password123',
    });

    await playerService.deletePlayer(created.id);

    const dbPlayer = await Player.findById(created.id);
    expect(dbPlayer).toBeNull();
  });

  it('should not create a player with a duplicate email', async () => {
    await playerService.createPlayer({
      username: 'user1',
      email: 'duplicate@example.com',
      password: 'password123',
    });

    await expect(
      playerService.createPlayer({
        username: 'user2',
        email: 'duplicate@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow('Player with this email already exists');
  });

  it('should not create a player with a duplicate username', async () => {
    await playerService.createPlayer({
      username: 'duplicateuser',
      email: 'user1@example.com',
      password: 'password123',
    });

    await expect(
      playerService.createPlayer({
        username: 'duplicateuser',
        email: 'user2@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow('Player with this username already exists');
  });
});
