import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
  makeRequest,
  createTestPlayer,
  loginPlayer,
} from '../setup.js';

describe('E2E - Play Card', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('deve retornar 401 se não estiver autenticado', async () => {
    const response = await makeRequest('POST', '/api/games/123/play', {
      body: { cardId: '123' },
    });

    expect(response.status).toBe(401);
  });

  it('deve retornar 404 quando o jogo não existe', async () => {
    const email = `test_${Date.now()}@test.com`;

    await createTestPlayer({ email });

    const login = await loginPlayer(email, 'Test@123456');
    const token = login.data.accessToken;

    const fakeId = '65f000000000000000000000';

    const response = await makeRequest('POST', `/api/games/${fakeId}/play`, {
      token,
      body: {
        cardId: 'card-1',
      },
    });

    expect(response.status).toBe(404);
  });

  it('deve retornar 400 quando o id do jogo é inválido', async () => {
    const email = `test_${Date.now()}@test.com`;

    await createTestPlayer({ email });

    const login = await loginPlayer(email, 'Test@123456');
    const token = login.data.accessToken;
    const response = await makeRequest('POST', `/api/games/123/play`, {
      token,
      body: {
        cardId: 'card-1',
      },
    });

    expect(response.status).toBe(400);
  });

  it('deve retornar 400 quando cardId não é enviado', async () => {
    const email = `test_${Date.now()}@test.com`;

    await createTestPlayer({ email });

    const login = await loginPlayer(email, 'Test@123456');

    const token = login.data.accessToken;

    const fakeId = '507f1f77bcf86cd799439011';

    const response = await makeRequest('POST', `/api/games/${fakeId}/play`, {
      token,
      body: {},
    });

    expect(response.status).toBe(400);
  });
});
