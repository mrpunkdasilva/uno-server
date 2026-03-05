import {
  setupTestEnvironment,
  teardownTestEnvironment,
  makeRequest,
  createTestPlayer,
  loginPlayer,
} from './setup.js';

describe('Game Management E2E Flow', () => {
  let player1Token;
  let player2Token;
  let gameId;

  beforeAll(async () => {
    await setupTestEnvironment();

    // Setup player 1
    const p1Data = {
      username: 'player1_e2e',
      email: 'p1_e2e@example.com',
      password: 'Password123!',
    };
    await createTestPlayer(p1Data);
    const login1 = await loginPlayer(p1Data.email, p1Data.password);
    // Based on AuthService.login, it returns { success: true, accessToken, refreshToken }
    // The DTO or controller might wrap it. Let's try to find accessToken.
    player1Token =
      login1.data.accessToken ||
      login1.data.data?.accessToken ||
      login1.data.token;

    // Setup player 2
    const p2Data = {
      username: 'player2_e2e',
      email: 'p2_e2e@example.com',
      password: 'Password123!',
    };
    await createTestPlayer(p2Data);
    const login2 = await loginPlayer(p2Data.email, p2Data.password);
    player2Token =
      login2.data.accessToken ||
      login2.data.data?.accessToken ||
      login2.data.token;

    if (!player1Token || !player2Token) {
      console.error('Login failed to return tokens:', {
        login1: login1.data,
        login2: login2.data,
      });
    }
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('should complete the full game management lifecycle', async () => {
    // 1. Create Game
    const createResponse = await makeRequest('POST', '/api/games', {
      token: player1Token,
      body: {
        name: 'E2E Test Game',
        rules: 'Standard UNO rules for testing purposes',
        maxPlayers: 4,
        minPlayers: 2,
      },
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.data.message).toBe('Game created successfully');
    expect(createResponse.data.game_id).toBeDefined();
    gameId = createResponse.data.game_id;

    // 2. List Games
    const listResponse = await makeRequest('GET', '/api/games', {
      token: player1Token,
    });

    expect(listResponse.status).toBe(200);
    expect(listResponse.data.success).toBe(true);
    const foundGame = listResponse.data.data.find((g) => g.id === gameId);
    expect(foundGame).toBeDefined();
    expect(foundGame.title).toBe('E2E Test Game');

    // 3. Get Game Details
    const getResponse = await makeRequest('GET', `/api/games/${gameId}`, {
      token: player1Token,
    });

    expect(getResponse.status).toBe(200);
    expect(getResponse.data.success).toBe(true);
    expect(getResponse.data.data.id).toBe(gameId);
    expect(getResponse.data.data.status).toBe('Waiting');

    // 4. Update Game
    const updateResponse = await makeRequest('PUT', `/api/games/${gameId}`, {
      token: player1Token,
      body: {
        title: 'Updated E2E Game Name',
      },
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.success).toBe(true);
    expect(updateResponse.data.data.title).toBe('Updated E2E Game Name');

    // 5. Join Game
    const joinResponse = await makeRequest('GET', `/api/games/${gameId}/join`, {
      token: player2Token,
    });

    expect(joinResponse.status).toBe(200);
    expect(joinResponse.data.success).toBe(true);
    const joinData = joinResponse.data.data?._value || joinResponse.data.data;
    expect(joinData?.message).toContain('joined');

    // 6. Ready status for both players
    await makeRequest('GET', `/api/games/${gameId}/ready`, {
      token: player1Token,
    });
    const ready2Response = await makeRequest(
      'GET',
      `/api/games/${gameId}/ready`,
      {
        token: player2Token,
      },
    );
    expect(ready2Response.status).toBe(200);

    // 7. Start Game
    const startResponse = await makeRequest(
      'GET',
      `/api/games/${gameId}/start`,
      {
        token: player1Token,
      },
    );

    expect(startResponse.status).toBe(200);
    expect(startResponse.data.success).toBe(true);
    expect(startResponse.data.message).toBe('Game started successfully');

    // 8. Verify Status is Active
    const statusResponse = await makeRequest(
      'GET',
      `/api/games/${gameId}/status`,
      {
        token: player1Token,
      },
    );
    expect(statusResponse.data.data.status).toBe('Active');

    // 9. Abandon Game
    const abandonResponse = await makeRequest(
      'GET',
      `/api/games/${gameId}/abandon`,
      {
        token: player2Token,
      },
    );
    expect(abandonResponse.status).toBe(200);
    expect(abandonResponse.data.message).toBe('You left the game');

    // 10. Delete Game
    const deleteResponse = await makeRequest('DELETE', `/api/games/${gameId}`, {
      token: player1Token,
    });
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.data.message).toBe('Game deleted successfully');

    // 11. Verify deletion (404)
    const finalCheck = await makeRequest('GET', `/api/games/${gameId}`, {
      token: player1Token,
    });
    expect(finalCheck.status).toBe(404);
  });
});
