/**
 * Comprar cartas
 * - Comprar carta retorna 200/201
 * - Carta adicionada à mão do jogador
 * - Sem autenticação retorna 401
 * - ID inexistente retorna 404
 * - ID inválido retorna 400
 */
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
  makeRequest,
  createTestPlayer,
  loginPlayer,
  createTestGame,
} from '../setup.js';

describe('E2E: Draw Card (Comprar Carta)', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  let tokenA, tokenB, gameId;

  beforeEach(async () => {
    // Criar jogador A (criador)
    const playerARes = await createTestPlayer({
      username: 'playerA',
      email: 'a@test.com',
      password: 'Test@123',
    });
    playerA = playerARes.data;
    const loginARes = await loginPlayer('a@test.com', 'Test@123');
    tokenA = loginARes.data.accessToken;

    // Criar jogador B
    const playerBRes = await createTestPlayer({
      username: 'playerB',
      email: 'b@test.com',
      password: 'Test@123',
    });
    playerB = playerBRes.data;
    const loginBRes = await loginPlayer('b@test.com', 'Test@123');
    tokenB = loginBRes.data.accessToken;

    // Criar jogo com jogador A
    const gameRes = await createTestGame(tokenA, {
      title: 'Test Game',
      maxPlayers: 4,
    });
    gameId = gameRes.data.game_id; // Ajuste conforme retorno real da API

    // Jogador B entra no jogo
    await makeRequest('GET', `/api/games/${gameId}/join`, { token: tokenB });

    // Ambos marcam como prontos
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenA });
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenB });

    // Iniciar jogo (criador)
    await makeRequest('GET', `/api/games/${gameId}/start`, { token: tokenA });
  });

  it('deve retornar 401 quando não houver token de autenticação', async () => {
    const response = await makeRequest('POST', `/api/games/${gameId}/draw`, {
      token: null, // sem token
    });

    expect(response.status).toBe(401);
  });

  it('deve retornar 404 quando o ID do jogo não existir', async () => {
    const fakeId = '507f1f77bcf86cd799439011'; // ObjectId válido, mas não existente
    const response = await makeRequest('POST', `/api/games/${fakeId}/draw`, {
      token: tokenA,
    });

    expect(response.status).toBe(404);
  });
});
