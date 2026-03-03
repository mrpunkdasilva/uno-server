import { jest } from '@jest/globals';

// Mock AuthService before importing app to avoid Redis connection issues
jest.unstable_mockModule('../../src/core/services/auth.service.js', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        verifyTokenIsBlacklisted: jest.fn().mockResolvedValue(false),
      };
    }),
  };
});

// Set environment to test to disable cache via devCacheConfig
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CACHE_ENABLED = 'false';

const { app } = await import('../../src/app.js');
const { default: Player } = await import(
  '../../src/infra/models/player.model.js'
);
const { default: request } = await import('supertest');
const { default: mongoose } = await import('mongoose');
const { MongoMemoryServer } = await import('mongodb-memory-server');
const { default: jwt } = await import('jsonwebtoken');
const { default: bcrypt } = await import('bcrypt');

describe('Game Management E2E Flow', () => {
  let mongoServer;
  let player1Token;
  let player2Token;
  let player1Id;
  let player2Id;
  let gameId;

  const JWT_SECRET = 'test-secret';

  beforeAll(async () => {
    // Setup MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URI = uri;

    await mongoose.connect(uri);

    // Create test players
    const hashedPassword = await bcrypt.hash('password123', 10);

    const player1 = await Player.create({
      username: 'player1',
      email: 'player1@example.com',
      password: hashedPassword,
    });
    player1Id = player1._id.toString();
    player1Token = jwt.sign({ id: player1Id, username: 'player1' }, JWT_SECRET);

    const player2 = await Player.create({
      username: 'player2',
      email: 'player2@example.com',
      password: hashedPassword,
    });
    player2Id = player2._id.toString();
    player2Token = jwt.sign({ id: player2Id, username: 'player2' }, JWT_SECRET);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should complete the full game management lifecycle', async () => {
    // 1. Create Game
    const createResponse = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${player1Token}`)
      .send({
        name: 'E2E Test Game',
        rules: 'Standard UNO rules for testing purposes',
        maxPlayers: 4,
        minPlayers: 2,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.message).toBe('Game created successfully');
    expect(createResponse.body.game_id).toBeDefined();
    gameId = createResponse.body.game_id;

    // 2. List Games
    const listResponse = await request(app)
      .get('/api/games')
      .set('Authorization', `Bearer ${player1Token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    const foundGame = listResponse.body.data.find((g) => g.id === gameId);
    expect(foundGame).toBeDefined();
    expect(foundGame.title).toBe('E2E Test Game');

    // 3. Get Game By ID
    const getResponse = await request(app)
      .get(`/api/games/${gameId}`)
      .set('Authorization', `Bearer ${player1Token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.id).toBe(gameId);
    expect(getResponse.body.data.status).toBe('Waiting');

    // 4. Update Game
    const updateResponse = await request(app)
      .put(`/api/games/${gameId}`)
      .set('Authorization', `Bearer ${player1Token}`)
      .send({
        title: 'Updated E2E Game Name',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.title).toBe('Updated E2E Game Name');

    // 5. Join Game (Player 2)
    const joinResponse = await request(app)
      .get(`/api/games/${gameId}/join`)
      .set('Authorization', `Bearer ${player2Token}`);

    expect(joinResponse.status).toBe(200);
    expect(joinResponse.body.success).toBe(true);

    // The response is wrapped in a Result object (data._value)
    const joinData = joinResponse.body.data._value || joinResponse.body.data;
    expect(joinData.message).toContain('joined');

    // 6. Set Ready (Player 1)
    const ready1Response = await request(app)
      .get(`/api/games/${gameId}/ready`)
      .set('Authorization', `Bearer ${player1Token}`);
    expect(ready1Response.status).toBe(200);

    // 7. Set Ready (Player 2)
    const ready2Response = await request(app)
      .get(`/api/games/${gameId}/ready`)
      .set('Authorization', `Bearer ${player2Token}`);
    expect(ready2Response.status).toBe(200);

    const ready2Data =
      ready2Response.body.data._value || ready2Response.body.data;
    expect(ready2Data.message).toBe('Player set to ready');

    // 8. Start Game
    const startResponse = await request(app)
      .get(`/api/games/${gameId}/start`)
      .set('Authorization', `Bearer ${player1Token}`);

    expect(startResponse.status).toBe(200);
    expect(startResponse.body.success).toBe(true);
    expect(startResponse.body.message).toBe('Game started successfully');

    // Verify status is now Active
    const statusResponse = await request(app)
      .get(`/api/games/${gameId}/status`)
      .set('Authorization', `Bearer ${player1Token}`);
    expect(statusResponse.body.data.status).toBe('Active');

    // 9. Abandon Game (Player 2)
    const abandonResponse = await request(app)
      .get(`/api/games/${gameId}/abandon`)
      .set('Authorization', `Bearer ${player2Token}`);

    expect(abandonResponse.status).toBe(200);
    expect(abandonResponse.body.message).toBe('You left the game');

    // 10. Delete Game
    const deleteResponse = await request(app)
      .delete(`/api/games/${gameId}`)
      .set('Authorization', `Bearer ${player1Token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);
    expect(deleteResponse.body.message).toBe('Game deleted successfully');

    // Verify it's gone
    const finalGetResponse = await request(app)
      .get(`/api/games/${gameId}`)
      .set('Authorization', `Bearer ${player1Token}`);
    expect(finalGetResponse.status).toBe(404);
  });
});
