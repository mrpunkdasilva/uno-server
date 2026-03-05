import {
  setupTestEnvironment,
  teardownTestEnvironment,
  clearDatabase,
  makeRequest,
  createTestPlayer,
  loginPlayer,
} from './setup.js';

describe('E2E: Authentication and Players Management', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Use Case 1: Register New Players', () => {
    it('should register a new player successfully', async () => {
      const playerData = {
        username: 'novoJogador',
        email: 'novo@jogador.com',
        password: 'Password@123456',
      };

      const response = await makeRequest('POST', '/api/auth/register', {
        body: playerData,
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('player');
      expect(response.data.player).toHaveProperty('id');
      expect(response.data.player.username).toBe(playerData.username);
      expect(response.data.player.email).toBe(playerData.email);
      expect(response.data.player).not.toHaveProperty('password');
    });

    it('should return error 400 when trying to register with invalid data', async () => {
      const invalidData = {
        username: 'ab',
        email: 'email-invalido',
        password: '123',
      };

      const response = await makeRequest('POST', '/api/auth/register', {
        body: invalidData,
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    it('should return error 400 when required fields are missing', async () => {
      const response = await makeRequest('POST', '/api/auth/register', {
        body: {
          username: 'jogador',
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Use Case 2: Login Players', () => {
    const testPlayer = {
      username: 'playerLogin',
      email: 'login@test.com',
      password: 'Password@123456',
    };

    beforeEach(async () => {
      await createTestPlayer(testPlayer);
    });

    it('should login successfully and return tokens', async () => {
      const response = await loginPlayer(testPlayer.email, testPlayer.password);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
    });

    it('should return error 401 with invalid credentials', async () => {
      const response = await loginPlayer(
        testPlayer.email,
        'PasswordErrada@123',
      );

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toBe('Invalid credentials');
    });

    it('should return error 400 when required fields are missing', async () => {
      const response = await makeRequest('POST', '/api/auth/login', {
        body: {
          email: testPlayer.email,
        },
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Use Case 3: Refresh Token', () => {
    const testPlayer = {
      username: 'playerRefresh',
      email: 'refresh@test.com',
      password: 'Password@123456',
    };

    let refreshToken;

    beforeEach(async () => {
      await createTestPlayer(testPlayer);
      const loginResponse = await loginPlayer(
        testPlayer.email,
        testPlayer.password,
      );
      refreshToken = loginResponse.data.refreshToken;
    });

    it('should refresh token successfully with valid refresh token', async () => {
      const response = await makeRequest('POST', '/api/auth/refresh-token', {
        body: { refreshToken },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('token');
      expect(response.data.token).toBeTruthy();
    });

    it('should return error 400 with invalid refresh token', async () => {
      const response = await makeRequest('POST', '/api/auth/refresh-token', {
        body: { refreshToken: 'token_invalido_xyz' },
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should return error 400 when refresh token is missing', async () => {
      const response = await makeRequest('POST', '/api/auth/refresh-token', {
        body: {},
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Use Case 4: Authenticated Player Profile', () => {
    const testPlayer = {
      username: 'playerProfile',
      email: 'profile@test.com',
      password: 'Password@123456',
    };

    let accessToken;

    beforeEach(async () => {
      await createTestPlayer(testPlayer);
      const loginResponse = await loginPlayer(
        testPlayer.email,
        testPlayer.password,
      );
      accessToken = loginResponse.data.accessToken;
    });

    it('should return authenticated player profile successfully', async () => {
      const response = await makeRequest('GET', '/api/auth/profile', {
        token: accessToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.username).toBe(testPlayer.username);
      expect(response.data.email).toBe(testPlayer.email);
      expect(response.data).not.toHaveProperty('password');
    });

    it('should return error 401 without authentication token', async () => {
      const response = await makeRequest('GET', '/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });

    it('should return error 401 with invalid token', async () => {
      const response = await makeRequest('GET', '/api/auth/profile', {
        token: 'token_invalido_xyz',
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Use Case 5: Logout', () => {
    const testPlayer = {
      username: 'playerLogout',
      email: 'logout@test.com',
      password: 'Password@123456',
    };

    let accessToken;

    beforeEach(async () => {
      await createTestPlayer(testPlayer);
      const loginResponse = await loginPlayer(
        testPlayer.email,
        testPlayer.password,
      );
      accessToken = loginResponse.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await makeRequest('POST', '/api/auth/logout', {
        token: accessToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should return error 401 when logging out without token', async () => {
      const response = await makeRequest('POST', '/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Use Case 6: Player Management (CRUD)', () => {
    let accessToken;
    let playerId;

    beforeEach(async () => {
      const playerResponse = await createTestPlayer({
        username: 'adminPlayer',
        email: 'admin@test.com',
        password: 'Admin@123456',
      });

      const loginResponse = await loginPlayer('admin@test.com', 'Admin@123456');
      accessToken = loginResponse.data.accessToken;
      playerId = playerResponse.data.player.id;
    });

    it('should list all players', async () => {
      // Criar mais jogadores
      await createTestPlayer({
        username: 'player1',
        email: 'player1@test.com',
        password: 'Pass@123456',
      });
      await createTestPlayer({
        username: 'player2',
        email: 'player2@test.com',
        password: 'Pass@123456',
      });

      const response = await makeRequest('GET', '/api/players', {
        token: accessToken,
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should get a player by ID', async () => {
      const response = await makeRequest('GET', `/api/players/${playerId}`, {
        token: accessToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', playerId);
      expect(response.data).toHaveProperty('username');
      expect(response.data).not.toHaveProperty('password');
    });

    it('should return error 404 when getting a non-existent player', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await makeRequest('GET', `/api/players/${fakeId}`, {
        token: accessToken,
      });

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
      expect(response.data).toHaveProperty('message');
    });

    it("should update a player's information", async () => {
      const updateData = {
        username: 'usernameAtualizado',
      };

      const response = await makeRequest('PUT', `/api/players/${playerId}`, {
        token: accessToken,
        body: updateData,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('username');
      expect(response.data.username).toBe(updateData.username);
    });

    it('should delete a player', async () => {
      const response = await makeRequest('DELETE', `/api/players/${playerId}`, {
        token: accessToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');

      const getResponse = await makeRequest('GET', `/api/players/${playerId}`, {
        token: accessToken,
      });

      expect(getResponse.status).toBe(404);
    });

    it('should return error 401 when accessing players endpoints without authentication', async () => {
      const response = await makeRequest('GET', '/api/players');

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('Security Validations', () => {
    it('should not return password in register response', async () => {
      const response = await createTestPlayer({
        username: 'secureUser',
        email: 'secure@test.com',
        password: 'Password@123456',
      });

      expect(response.data.player).not.toHaveProperty('password');
    });

    it('should not return password in login response', async () => {
      await createTestPlayer({
        username: 'secureUser2',
        email: 'secure2@test.com',
        password: 'Password@123456',
      });

      const response = await loginPlayer('secure2@test.com', 'Password@123456');
      expect(response.data).not.toHaveProperty('password');
    });

    it('should reject weak passwords', async () => {
      const response = await makeRequest('POST', '/api/auth/register', {
        body: {
          username: 'weakpass',
          email: 'weak@test.com',
          password: '1234',
        },
      });

      expect(response.status).toBe(400);
    });
  });
});
