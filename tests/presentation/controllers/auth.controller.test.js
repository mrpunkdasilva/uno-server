import request from 'supertest';
import express from 'express';
import AuthController from '../../../src/presentation/controllers/auth.controller.js';
import AuthService from '../../../src/core/services/auth.service.js';
import PlayerService from '../../../src/core/services/player.service.js';
import { Result } from '../../../src/core/utils/Result.js';

// Mock the services
jest.mock('../../../src/core/services/auth.service.js');
jest.mock('../../../src/core/services/player.service.js');

describe('AuthController', () => {
  let app;
  let controller;
  let mockAuthService;
  let mockPlayerService;

  beforeEach(() => {
    jest.clearAllMocks();

    // AuthController instantiates its own services
    controller = new AuthController();
    mockAuthService = AuthService.mock.instances[0];
    mockPlayerService = PlayerService.mock.instances[0];

    app = express();
    app.use(express.json());

    // Basic routing for test
    app.post('/auth/register', (req, res, next) =>
      controller.register(req, res).catch(next),
    );
    app.post('/auth/login', (req, res, next) =>
      controller.login(req, res).catch(next),
    );
    app.get('/auth/profile', (req, res, next) => {
      req.user = { id: 'u1' };
      controller.getAuthenticatedPlayerProfile(req, res).catch(next);
    });

    // Error handler middleware
    app.use((err, req, res, _next) => {
      res.status(err.statusCode || 500).json({ message: err.message });
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new player', async () => {
      const playerData = {
        email: 'test@test.com',
        password: 'password123',
        username: 'user1',
      };
      mockPlayerService.createPlayer.mockResolvedValue(
        Result.success({ id: 'p1', ...playerData }),
      );

      const response = await request(app)
        .post('/auth/register')
        .send(playerData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should fail if fields are missing', async () => {
      const response = await request(app).post('/auth/register').send({});
      expect(response.status).toBe(400);
    });

    it('should fail if password is too short', async () => {
      const response = await request(app).post('/auth/register').send({
        email: 'a@b.com',
        username: 'u',
        password: '123',
      });
      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login player', async () => {
      const credentials = { email: 'test@test.com', password: 'password123' };
      const loginResult = { token: 'jwt-token' };
      mockAuthService.login.mockResolvedValue(loginResult);

      const response = await request(app).post('/auth/login').send(credentials);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(loginResult);
    });

    it('should fail if login fields are missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'a@b.com' });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return player profile', async () => {
      mockPlayerService.getPlayerById.mockResolvedValue(
        Result.success({ id: 'u1', username: 'user1' }),
      );

      const response = await request(app).get('/auth/profile');

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('user1');
    });

    it('should fail if player not found', async () => {
      mockPlayerService.getPlayerById.mockResolvedValue(
        Result.failure(new Error('Player not found')),
      );

      const response = await request(app).get('/auth/profile');

      expect(response.status).toBe(404);
    });
  });
});
