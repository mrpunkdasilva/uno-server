import request from 'supertest';
import express from 'express';
import AuthController from '../../../src/presentation/controllers/auth.controller.js';
import AuthService from '../../../src/core/services/auth.service.js';

jest.mock('../../../src/core/services/auth.service.js');
jest.mock('../../../src/core/services/player.service.js');

describe('AuthController Extra', () => {
  let app;
  let controller;
  let mockAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController();
    mockAuthService = AuthService.mock.instances[0];

    app = express();
    app.use(express.json());

    app.post('/auth/logout', (req, res, next) => {
      req.user = { id: 'u1' };
      controller.logout(req, res).catch(next);
    });
    app.post('/auth/refresh', (req, res, next) =>
      controller.refreshToken(req, res).catch(next),
    );

    app.use((err, req, res, _next) => {
      res.status(err.statusCode || 500).json({ message: err.message });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should fail if no header', async () => {
      const response = await request(app).post('/auth/logout');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token', async () => {
      mockAuthService.refreshToken.mockResolvedValue({ token: 'new' });
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'ref' });
      expect(response.status).toBe(200);
    });

    it('should fail if no refresh token', async () => {
      const response = await request(app).post('/auth/refresh').send({});
      expect(response.status).toBe(400);
    });
  });
});
