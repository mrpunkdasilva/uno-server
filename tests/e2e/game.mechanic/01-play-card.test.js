import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
  makeRequest,
  createTestPlayer,
  loginPlayer,
  createTestGame,
} from '../setup.js';

describe('E2E - Play Card', () => {
  let token;
  let player;
  let gameId;

  beforeAll(async () => {
    await setupTestEnvironment();

    // Criar jogador global
    const email = `test_global_${Date.now()}@test.com`;
    const createResp = await createTestPlayer({ email });
    player = createResp.data.player;

    console.log('PLAYER ID:', player.id); // log do player

    const loginResp = await loginPlayer(email, 'Test@123456');
    token = loginResp.data.accessToken;

    // Criar jogo global
    const game = await createTestGame(token);
    gameId = game.data.game || game.data._id;

    console.log('GAME ID:', gameId, game.data); // log do game
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Caso clearDatabase apague o jogo, recrie ele aqui
    const gameResp = await createTestGame(token);
    gameId = gameResp.data._id;
  });

  it('deve retornar 401 se não estiver autenticado', async () => {
    const response = await makeRequest('POST', `/api/games/${gameId}/play`, {
      body: { cardId: 'card-1' },
    });

    expect(response.status).toBe(401);
  });

  it('deve retornar 404 quando o jogo não existe', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const response = await makeRequest('POST', `/api/games/${fakeId}/play`, {
      token,
      body: { cardId: 'card-1' },
    });

    expect(response.status).toBe(404);
  });

  it('deve retornar 400 quando o id do jogo é inválido', async () => {
    const response = await makeRequest('POST', '/api/games/123/play', {
      token,
      body: { cardId: 'card-1' },
    });

    expect(response.status).toBe(400);
  });

  it('deve retornar 400 quando cardId não é enviado', async () => {
    const response = await makeRequest('POST', `/api/games/${gameId}/play`, {
      token,
      body: {},
    });

    expect(response.status).toBe(400);
  });

  it('deve retornar 400 ou 409 quando a carta não é válida', async () => {
    const response = await makeRequest('POST', `/api/games/${gameId}/play`, {
      token,
      body: { cardId: 'invalid-card' },
    });

    expect([400, 409]).toContain(response.status);
  });
});
