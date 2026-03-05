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
import Game from '../../../src/infra/models/game.model.js';

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

  let playerA, tokenA, tokenB, gameId;

  // Função auxiliar para extrair a mão da resposta
  const extractHand = (response) => {
    return response.data?.hand;
  };

  beforeEach(async () => {
    // Criar jogador A
    const playerARes = await createTestPlayer({
      username: 'playerA',
      email: 'a@test.com',
      password: 'Test@123',
    });
    playerA = playerARes.data?.player || playerARes.data;
    const loginARes = await loginPlayer('a@test.com', 'Test@123');
    tokenA = loginARes.data.accessToken;

    // Criar jogador B
    const playerBRes = await createTestPlayer({
      username: 'playerB',
      email: 'b@test.com',
      password: 'Test@123',
    });
    playerB = playerBRes.data?.player || playerBRes.data;
    const loginBRes = await loginPlayer('b@test.com', 'Test@123');
    tokenB = loginBRes.data.accessToken;

    // Criar jogo
    const gameRes = await createTestGame(tokenA, {
      name: 'Test Game',
      rules: 'Standard UNO rules for testing',
      minPlayers: 2,
      maxPlayers: 4,
    });
    gameId = gameRes.data?.game_id || gameRes.data?.id;

    if (!gameId) {
      throw new Error('Falha ao criar jogo: gameId não obtido');
    }

    // Jogador B entra no jogo (GET)
    const joinRes = await makeRequest('GET', `/api/games/${gameId}/join`, {
      token: tokenB,
    });
    if (joinRes.status !== 200) {
      throw new Error('Jogador B não conseguiu entrar no jogo');
    }

    // Ambos marcam como prontos
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenA });
    await makeRequest('GET', `/api/games/${gameId}/ready`, { token: tokenB });

    // Iniciar jogo (criador)
    const startRes = await makeRequest('GET', `/api/games/${gameId}/start`, {
      token: tokenA,
    });
    if (startRes.status !== 200) {
      console.error('Falha ao iniciar o jogo:', startRes.data);
      throw new Error('Jogo não iniciou');
    }

    // jogador não tem cartas jogáveis, isso força situação de compra
    const game = await Game.findById(gameId).exec();
    if (!game) throw new Error('Jogo não encontrado no banco');

    const topCard = game.discardPile[game.discardPile.length - 1];
    if (!topCard) throw new Error('Discard pile vazio após iniciar o jogo');

    // Escolhe uma cor diferente e um valor diferente
    const colors = ['red', 'blue', 'green', 'yellow'];
    const otherColor = colors.find((c) => c !== topCard.color) || 'blue';
    // Escolhe um valor diferente do topo (se for número, usar outro número)
    let otherValue = '1';
    if (topCard.value === '1') otherValue = '2';
    else if (topCard.type === 'action') otherValue = '5'; // usa número para garantir

    const playerAEntry = game.players.find(
      (p) => p._id.toString() === playerA.id,
    );
    if (!playerAEntry) throw new Error('Jogador A não encontrado no jogo');

    // Substituir a mão por 7 cartas idênticas não jogáveis
    playerAEntry.hand = Array(7)
      .fill()
      .map((_, i) => ({
        cardId: `test-card-${i}`,
        color: otherColor,
        value: otherValue,
        type: 'number',
      }));

    await game.save();
  });

  it('deve retornar 401 quando não houver token de autenticação', async () => {
    const response = await makeRequest('POST', `/api/games/${gameId}/draw`, {
      token: null,
    });
    expect(response.status).toBe(401);
  });

  it('deve retornar 404 quando o ID do jogo não existir', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const response = await makeRequest('POST', `/api/games/${fakeId}/draw`, {
      token: tokenA,
    });
    expect(response.status).toBe(404);
  });

  it('deve comprar uma carta com sucesso (200 ou 201)', async () => {
    const response = await makeRequest('POST', `/api/games/${gameId}/draw`, {
      token: tokenA,
    });

    expect([200, 201]).toContain(response.status);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data).toHaveProperty('drawnCard');
  });

  it('deve adicionar carta à mão do jogador', async () => {
    // Obter mão antes da compra
    const beforeRes = await makeRequest('POST', `/api/games/${gameId}/hand`, {
      token: tokenA,
      body: { player: playerA.id },
    });
    const beforeHand = extractHand(beforeRes);
    expect(beforeHand).toBeDefined();
    const beforeCount = beforeHand.length;

    // Comprar carta
    const drawRes = await makeRequest('POST', `/api/games/${gameId}/draw`, {
      token: tokenA,
    });
    expect([200, 201]).toContain(drawRes.status);

    // Obter mão depois da compra
    const afterRes = await makeRequest('POST', `/api/games/${gameId}/hand`, {
      token: tokenA,
      body: { player: playerA.id },
    });
    const afterHand = extractHand(afterRes);
    // A mão pode aumentar em mais de uma carta devido à regra de comprar até achar jogável
    expect(afterHand.length).toBeGreaterThan(beforeCount);
  });

  it('deve retornar 400 quando o ID do jogo for inválido (mal formatado)', async () => {
    const invalidId = 'id-invalido';
    const response = await makeRequest('POST', `/api/games/${invalidId}/draw`, {
      token: tokenA,
    });
    expect(response.status).toBe(400);
  });
});
