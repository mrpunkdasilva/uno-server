/**
 * Estado atual do jogo
 * - Estado completo retorna todas as informações (200)
 * - Inclui jogadores, turno atual, status, carta do topo, cor atual e direção
 * - ID inexistente retorna 404
 * - ID inválido retorna 400
 * - Sem autenticação retorna 401
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

describe('E2E: Estado atual do jogo', () => {
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

  beforeEach(async () => {
    // Criar jogador A
    const playerARes = await createTestPlayer({
      username: `playerA_state_${Date.now()}`,
      email: `a_state_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    playerA = playerARes.data?.player || playerARes.data;
    const loginARes = await loginPlayer(playerA.email, 'Test@123');
    tokenA = loginARes.data.accessToken;

    // Criar jogador B
    const playerBRes = await createTestPlayer({
      username: `playerB_state_${Date.now()}`,
      email: `b_state_${Date.now()}@test.com`,
      password: 'Test@123',
    });
    playerB = playerBRes.data?.player || playerBRes.data;
    const loginBRes = await loginPlayer(playerB.email, 'Test@123');
    tokenB = loginBRes.data.accessToken;

    // Criar jogo
    const gameRes = await createTestGame(tokenA, {
      name: `State Game ${Date.now()}`,
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

  /**
   * Teste: Deve retornar 401 sem autenticação
   */
  it('deve retornar 401 sem token de autenticação', async () => {
    const response = await makeRequest('GET', `/api/games/${gameId}/state`, {
      token: null,
    });

    expect(response.status).toBe(401);
  });

  /**
   * Teste: Deve retornar 404 para ID de jogo inexistente
   */
  it('deve retornar 404 para ID de jogo inexistente', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const response = await makeRequest('GET', `/api/games/${fakeId}/state`, {
      token: tokenA,
    });

    expect(response.status).toBe(404);
  });

  /**
   * Teste: Deve retornar 400 para ID de jogo inválido (mal formatado)
   */
  it('deve retornar 400 para ID de jogo inválido', async () => {
    const invalidId = 'id-invalido-123';
    const response = await makeRequest('GET', `/api/games/${invalidId}/state`, {
      token: tokenA,
    });

    expect(response.status).toBe(400);
  });

  /**
   * Teste: Estado completo retorna 200 com todas as informações
   */
  it('deve retornar 200 com estado completo do jogo', async () => {
    const response = await makeRequest('GET', `/api/games/${gameId}/state`, {
      token: tokenA,
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('success', true);
    expect(response.data.data).toBeDefined();

    const state = response.data.data;

    // Verificar campos principais
    expect(state).toHaveProperty('gameId', gameId);
    expect(state).toHaveProperty('status', 'Active');
    expect(state).toHaveProperty('turnDirection'); // 'Clockwise' ou 'Counter-clockwise'
    expect(state).toHaveProperty('currentColor'); // pode ser null ou string
    expect(state).toHaveProperty('topCard'); // pode ser objeto ou null

    // Verificar lista de jogadores
    expect(state).toHaveProperty('players');
    expect(Array.isArray(state.players)).toBe(true);
    expect(state.players.length).toBe(2);

    // Verificar estrutura de cada jogador
    state.players.forEach((player) => {
      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('position');
      expect(player).toHaveProperty('handSize'); // deve ser número (mão mascarada)
      expect(player).toHaveProperty('hasDeclaredUno');
      expect(player).toHaveProperty('isCurrentTurn');
      expect(player).toHaveProperty('isMe'); // boolean indicando se é o jogador requisitante

      // Garantir que a mão completa NÃO está exposta
      expect(player).not.toHaveProperty('hand');
    });

    // Verificar se o jogador atual (turno) está marcado corretamente
    const currentPlayer = state.players.find((p) => p.isCurrentTurn === true);
    expect(currentPlayer).toBeDefined();

    // Verificar se o campo 'isMe' está correto para o jogador A
    const playerAMe = state.players.find((p) => p.id === playerA.id);
    expect(playerAMe.isMe).toBe(true);

    const playerBMe = state.players.find((p) => p.id === playerB.id);
    expect(playerBMe.isMe).toBe(false);
  });

  /**
   * Teste: Verificar que o estado reflete corretamente a vez do jogador
   */
  it('deve indicar corretamente o jogador da vez', async () => {
    const response = await makeRequest('GET', `/api/games/${gameId}/state`, {
      token: tokenA,
    });

    expect(response.status).toBe(200);
    const state = response.data.data;

    // Encontrar jogador marcado como atual
    const currentPlayer = state.players.find(
      (p) => p.isCurrentTurn === true || p.isCurrentPlayer === true,
    );
    expect(currentPlayer).toBeDefined();

    // Validar com o banco de dados
    const game = await Game.findById(gameId).exec();
    const expectedCurrentPlayerId =
      game.players[game.currentPlayerIndex]._id.toString();
    expect(currentPlayer.id).toBe(expectedCurrentPlayerId);
  });

  /**
   * Teste: Verificar que a carta do topo é retornada corretamente (se houver)
   */
  it('deve retornar a carta do topo do monte de descarte', async () => {
    const response = await makeRequest('GET', `/api/games/${gameId}/state`, {
      token: tokenA,
    });

    expect(response.status).toBe(200);
    const state = response.data.data;

    // O jogo iniciado deve ter pelo menos uma carta no discardPile
    expect(state.topCard).toBeDefined();

    if (state.topCard) {
      expect(state.topCard).toHaveProperty('cardId');
      expect(state.topCard).toHaveProperty('color');
      expect(state.topCard).toHaveProperty('value');
      expect(state.topCard).toHaveProperty('type');
    }
  });

  /**
   * Teste: Verificar que a cor atual pode ser null (quando não há wild)
   */
  it('deve permitir currentColor como null', async () => {
    const response = await makeRequest('GET', `/api/games/${gameId}/state`, {
      token: tokenA,
    });

    expect(response.status).toBe(200);
    const state = response.data.data;

    // Após iniciar o jogo, a cor atual pode ser null (a menos que a primeira carta seja wild)
    expect(state.currentColor).toBeDefined(); // pode ser null ou string
  });
});
