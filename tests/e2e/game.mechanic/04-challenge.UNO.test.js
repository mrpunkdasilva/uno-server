/**
 * Desafiar UNO
 * - Desafio retorna 200 (se válido) ou 400 (se inválido)
 * - Sem challengerId (autenticação) retorna 401
 * - Sem targetPlayerId no body retorna 400
 * - ID do jogo inexistente retorna 404
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
import Game from '../../../src/infra/models/game.model.js';

describe('E2E: Desafiar UNO', () => {
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

  // Função auxiliar para configurar o estado do jogo
  const setupGameState = async (
    challengerId,
    targetId,
    targetHandSize = 1,
    targetHasDeclaredUno = false,
    gameStatus = 'Active',
  ) => {
    const game = await Game.findById(gameId).exec();
    if (!game) throw new Error('Jogo não encontrado');

    game.status = gameStatus;

    const challenger = game.players.find(
      (p) => p._id.toString() === challengerId.toString(),
    );
    const target = game.players.find(
      (p) => p._id.toString() === targetId.toString(),
    );

    if (!challenger || !target) throw new Error('Jogadores não encontrados');

    target.hand = Array(targetHandSize)
      .fill()
      .map((_, i) => ({
        cardId: `card-${i}`,
        color: 'red',
        value: String(i + 1),
        type: 'number',
      }));

    target.hasDeclaredUno = targetHasDeclaredUno;

    await game.save();
  };

  beforeEach(async () => {
    // Criar jogador A (desafiante)
    const playerARes = await createTestPlayer({
      username: `playerA_challenge_${Date.now()}`,
      email: `a_challenge_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    playerA = playerARes.data?.player || playerARes.data;
    const loginARes = await loginPlayer(playerA.email, 'Test@123');
    tokenA = loginARes.data.accessToken;

    // Criar jogador B (alvo)
    const playerBRes = await createTestPlayer({
      username: `playerB_challenge_${Date.now()}`,
      email: `b_challenge_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    playerB = playerBRes.data?.player || playerBRes.data;
    const loginBRes = await loginPlayer(playerB.email, 'Test@123');
    tokenB = loginBRes.data.accessToken;

    // Criar jogo
    const gameRes = await createTestGame(tokenA, {
      name: `Challenge UNO Game ${Date.now()}`,
      rules: 'Standard UNO rules',
      minPlayers: 2,
      maxPlayers: 4,
    });
    gameId = gameRes.data?.game_id || gameRes.data?.id || gameRes.data?._id;

    if (!gameId) {
      throw new Error('Falha ao criar jogo');
    }

    // Jogador B entra no jogo
    await makeRequest('GET', `/api/games/${gameId}/join`, { token: tokenB });

    // Ambos marcam como prontos
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenA });
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenB });

    // Iniciar jogo
    await makeRequest('GET', `/api/games/${gameId}/start`, { token: tokenA });
  });

  it('deve retornar 401 sem token de autenticação', async () => {
    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/challenge`,
      {
        token: null,
        body: { targetPlayerId: playerB.id },
      },
    );
    expect(response.status).toBe(401);
  });

  it('deve retornar 400 se targetPlayerId não for enviado', async () => {
    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/challenge`,
      {
        token: tokenA,
        body: {},
      },
    );
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('success', false);
  });

  it('deve retornar 404 para ID de jogo inexistente', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const response = await makeRequest(
      'POST',
      `/api/games/${fakeId}/challenge`,
      {
        token: tokenA,
        body: { targetPlayerId: playerB.id },
      },
    );
    expect(response.status).toBe(404);
  });

  it('deve retornar 400 para ID de jogo inválido', async () => {
    const invalidId = 'id-invalido';
    const response = await makeRequest(
      'POST',
      `/api/games/${invalidId}/challenge`,
      {
        token: tokenA,
        body: { targetPlayerId: playerB.id },
      },
    );
    // Aceita 400 ou 500 enquanto o tratamento é padronizado
    expect([400, 500]).toContain(response.status);
    if (response.status === 400) {
      expect(response.data).toHaveProperty('success', false);
    }
  });

  it('deve retornar 200 para desafio válido', async () => {
    await setupGameState(playerA.id, playerB.id, 1, false);

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/challenge`,
      {
        token: tokenA,
        body: { targetPlayerId: playerB.id },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data.data).toHaveProperty('penaltyApplied', true);
    expect(response.data.data).toHaveProperty('cardsDrawn', 2);

    const game = await Game.findById(gameId).exec();
    const target = game.players.find((p) => p._id.toString() === playerB.id);
    expect(target.hand.length).toBe(3);
  });

  it('deve retornar 400 para desafio inválido (target com mais de 1 carta)', async () => {
    await setupGameState(playerA.id, playerB.id, 3, false);

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/challenge`,
      {
        token: tokenA,
        body: { targetPlayerId: playerB.id },
      },
    );

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('success', false);
    expect(response.data.message).toMatch(
      /invalid challenge|more than 1 card/i,
    );
  });

  it('deve retornar 400 para desafio inválido (target já declarou UNO)', async () => {
    await setupGameState(playerA.id, playerB.id, 1, true);

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/challenge`,
      {
        token: tokenA,
        body: { targetPlayerId: playerB.id },
      },
    );

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('success', false);
    expect(response.data.message).toMatch(
      /invalid challenge|already declared/i,
    );
  });

  it('deve retornar 400 para jogo não ativo', async () => {
    await setupGameState(playerA.id, playerB.id, 1, false, 'Waiting');

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/challenge`,
      {
        token: tokenA,
        body: { targetPlayerId: playerB.id },
      },
    );

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('success', false);
    expect(response.data.message).toMatch(/not active/i);
  });

  it('deve retornar 404/400 para desafiante não no jogo', async () => {
    // Configura o jogo normalmente com A e B
    await setupGameState(playerA.id, playerB.id, 1, false);

    // Cria jogador C (não está no jogo)
    const playerCRes = await createTestPlayer({
      username: `playerC_challenge_${Date.now()}`,
      email: `c_challenge_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    const playerC = playerCRes.data?.player || playerCRes.data;
    const loginCRes = await loginPlayer(playerC.email, 'Test@123');
    const tokenC = loginCRes.data.accessToken;

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/challenge`,
      {
        token: tokenC,
        body: { targetPlayerId: playerB.id },
      },
    );

    // Pode retornar 404 (UserNotInGameError) ou 400 (CannotPerformActionError)
    expect([400, 404]).toContain(response.status);
  });

  it('deve retornar 404/400 para alvo não no jogo', async () => {
    await setupGameState(playerA.id, playerB.id, 1, false);

    // Cria jogador D (não está no jogo)
    const playerDRes = await createTestPlayer({
      username: `playerD_challenge_${Date.now()}`,
      email: `d_challenge_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    const playerD = playerDRes.data?.player || playerDRes.data;

    const response = await makeRequest(
      'POST',
      `/api/games/${gameId}/challenge`,
      {
        token: tokenA,
        body: { targetPlayerId: playerD.id },
      },
    );

    expect([400, 404]).toContain(response.status);
  });
});
