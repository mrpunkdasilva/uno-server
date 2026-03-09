import request from 'supertest';
import express from 'express';
import PlayerController from '../../../src/presentation/controllers/player.controller.js';
import { Result } from '../../../src/core/utils/Result.js';

describe('PlayerController Extra', () => {
  let app;
  let mockPlayerService;
  let controller;

  beforeEach(() => {
    mockPlayerService = {
      getPlayerByEmail: jest.fn(),
      getPlayerByUsername: jest.fn(),
    };

    controller = new PlayerController(mockPlayerService);
    app = express();
    app.use(express.json());

    app.get('/players/email', (req, res) =>
      controller.getPlayerByEmail(req, res),
    );
    app.get('/players/username', (req, res) =>
      controller.getPlayerByUsername(req, res),
    );
  });

  describe('GET /players/email', () => {
    it('should return player by email', async () => {
      const player = { email: 'test@test.com' };
      mockPlayerService.getPlayerByEmail.mockResolvedValue(
        Result.success(player),
      );

      const response = await request(app).get(
        '/players/email?email=test@test.com',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(player);
    });

    it('should return 400 if no email query', async () => {
      const response = await request(app).get('/players/email');
      expect(response.status).toBe(400);
    });
  });

  describe('GET /players/username', () => {
    it('should return player by username', async () => {
      const player = { username: 'user1' };
      mockPlayerService.getPlayerByUsername.mockResolvedValue(
        Result.success(player),
      );

      const response = await request(app).get(
        '/players/username?username=user1',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(player);
    });

    it('should return 400 if no username query', async () => {
      const response = await request(app).get('/players/username');
      expect(response.status).toBe(400);
    });
  });
});
