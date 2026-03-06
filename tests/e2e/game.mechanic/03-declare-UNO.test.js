import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
  makeRequest,
  createTestPlayer,
  loginPlayer,
  createTestGame,
} from '../setup.js';
import Game from '../../../src/infra/models/game.model.js';

describe('E2E: Declarar UNO', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  let playerA, playerB, tokenA, tokenB, gameId;

  const setupGameWithCards = async (
    playerId,
    cardCount = 1,
    declaredUno = false,
  ) => {
    const game = await Game.findById(gameId).exec();
    expect(game).toBeDefined();

    const playerEntry = game.players.find((p) => p._id.toString() === playerId);
    expect(playerEntry).toBeDefined();

    // Configurar mão
    playerEntry.hand = Array(cardCount)
      .fill()
      .map((_, i) => ({
        cardId: `card-${i}`,
        color: 'red',
        value: String(i + 1),
        type: 'number',
      }));

    playerEntry.hasDeclaredUno = declaredUno;
    await game.save();
  };

  beforeEach(async () => {
    // Criar jogadores e jogo (igual antes)
    const timestamp = Date.now();

    const playerARes = await createTestPlayer({
      username: `playerA_${timestamp}`,
      email: `a_${timestamp}@test.com`,
      password: 'Test@123',
    });
    playerA = playerARes.data?.player || playerARes.data;
    const loginARes = await loginPlayer(playerA.email, 'Test@123');
    tokenA = loginARes.data.accessToken;

    const playerBRes = await createTestPlayer({
      username: `playerB_${timestamp}`,
      email: `b_${timestamp}@test.com`,
      password: 'Test@123',
    });
    playerB = playerBRes.data?.player || playerBRes.data;
    const loginBRes = await loginPlayer(playerB.email, 'Test@123');
    tokenB = loginBRes.data.accessToken;

    const gameRes = await createTestGame(tokenA, {
      name: `UNO Game ${timestamp}`,
      rules: 'Standard UNO rules',
      minPlayers: 2,
      maxPlayers: 4,
    });
    gameId = gameRes.data?.game_id || gameRes.data?.id || gameRes.data?._id;

    // Setup do jogo
    await makeRequest('GET', `/api/games/${gameId}/join`, { token: tokenB });
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenA });
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenB });
    await makeRequest('GET', `/api/games/${gameId}/start`, { token: tokenA });
  });

  test('deve retornar 401 sem autenticação', async () => {
    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/declare-uno`,
      {
        token: null,
      },
    );
    expect(response.status).toBe(401);
  });

  test('deve retornar 404 para ID inexistente', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const response = await makeRequest(
      'POST',
      `/api/games/${fakeId}/declare-uno`,
      {
        token: tokenA,
      },
    );
    expect(response.status).toBe(404);
  });

  test('deve retornar 400 para ID inválido', async () => {
    const response = await makeRequest(
      'POST',
      '/api/games/id-invalido/declare-uno',
      {
        token: tokenA,
      },
    );
    expect(response.status).toBe(400);
  });

  test('deve declarar UNO com sucesso (1 carta)', async () => {
    await setupGameWithCards(playerA.id, 1);

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/declare-uno`,
      {
        token: tokenA,
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toMatch(/UNO declared/i);

    const game = await Game.findById(gameId).exec();
    const player = game.players.find((p) => p._id.toString() === playerA.id);
    expect(player.hasDeclaredUno).toBe(true);
  });

  test('deve retornar 400 para jogador com mais de 2 cartas', async () => {
    await setupGameWithCards(playerA.id, 3);

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/declare-uno`,
      {
        token: tokenA,
      },
    );

    expect(response.status).toBe(400);
    expect(response.data.message).toMatch(/only declare UNO/i);
  });

  test('deve retornar 400 para jogo não ativo', async () => {
    await setupGameWithCards(playerA.id, 1);

    const game = await Game.findById(gameId).exec();
    game.status = 'Waiting';
    await game.save();

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/declare-uno`,
      {
        token: tokenA,
      },
    );

    expect(response.status).toBe(400);
    expect(response.data.message).toMatch(/not active/i);
  });

  test('deve retornar 404 para jogador não no jogo', async () => {
    await setupGameWithCards(playerA.id, 1);

    // Criar jogador C que não está no jogo
    const playerCRes = await createTestPlayer({
      username: `playerC_${Date.now()}`,
      email: `c_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    const playerC = playerCRes.data?.player || playerCRes.data;
    const loginCRes = await loginPlayer(playerC.email, 'Test@123');
    const tokenC = loginCRes.data.accessToken;

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/declare-uno`,
      {
        token: tokenC,
      },
    );

    expect(response.status).toBe(404);
    expect(response.data.message).toMatch(/not in this game/i);
  });

  test('deve permitir declarar UNO com 2 cartas', async () => {
    await setupGameWithCards(playerA.id, 2);

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/declare-uno`,
      {
        token: tokenA,
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  test('não deve permitir declarar UNO duas vezes', async () => {
    await setupGameWithCards(playerA.id, 1);

    // Primeira declaração
    const firstResponse = await makeRequest(
      'POST',
      `/api/games/${gameId}/declare-uno`,
      {
        token: tokenA,
      },
    );
    expect(firstResponse.status).toBe(200);

    // Segunda declaração
    const secondResponse = await makeRequest(
      'POST',
      `/api/games/${gameId}/declare-uno`,
      {
        token: tokenA,
      },
    );

    expect(secondResponse.status).toBe(400);
    expect(secondResponse.data.message).toMatch(/already declared UNO/i);
  });
});
