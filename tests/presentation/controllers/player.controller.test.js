import request from 'supertest';
import express from 'express';
import PlayerController from '../../../src/presentation/controllers/player.controller.js';
import { Result } from '../../../src/core/utils/Result.js';

describe('PlayerController', () => {
  let app;
  let mockPlayerService;
  let controller;

  beforeEach(() => {
    mockPlayerService = {
      getAllPlayers: jest.fn(),
      createPlayer: jest.fn(),
      getPlayerById: jest.fn(),
      getPlayerByEmail: jest.fn(),
      getPlayerByUsername: jest.fn(),
      updatePlayer: jest.fn(),
      deletePlayer: jest.fn(),
    };

    controller = new PlayerController(mockPlayerService);
    app = express();
    app.use(express.json());

    app.get('/players', (req, res) => controller.getAllPlayers(req, res));
    app.post('/players', (req, res) => controller.createPlayer(req, res));
    app.get('/players/:id', (req, res) => controller.getPlayerById(req, res));
    app.put('/players/:id', (req, res) => controller.updatePlayer(req, res));
    app.delete('/players/:id', (req, res) => controller.deletePlayer(req, res));
  });

  describe('GET /players', () => {
    it('should return all players', async () => {
      const players = [{ id: 'p1' }];
      mockPlayerService.getAllPlayers.mockResolvedValue(
        Result.success(players),
      );

      const response = await request(app).get('/players');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(players);
    });

    it('should handle errors in getAllPlayers', async () => {
      mockPlayerService.getAllPlayers.mockResolvedValue(
        Result.failure(new Error('Fail')),
      );
      const response = await request(app).get('/players');
      expect(response.status).toBe(500);
    });
  });

  describe('POST /players', () => {
    it('should create a player', async () => {
      const playerData = { email: 'a@b.com', password: 'pass', username: 'u' };
      mockPlayerService.createPlayer.mockResolvedValue(
        Result.success(playerData),
      );

      const response = await request(app).post('/players').send(playerData);

      expect(response.status).toBe(201);
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app).post('/players').send({ email: 'a' });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /players/:id', () => {
    it('should return player by ID', async () => {
      mockPlayerService.getPlayerById.mockResolvedValue(
        Result.success({ id: 'p1' }),
      );
      const response = await request(app).get('/players/p1');
      expect(response.status).toBe(200);
    });

    it('should return 404 if not found', async () => {
      mockPlayerService.getPlayerById.mockResolvedValue(
        Result.failure(new Error('Player not found')),
      );
      const response = await request(app).get('/players/p1');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /players/:id', () => {
    it('should update player', async () => {
      mockPlayerService.updatePlayer.mockResolvedValue(
        Result.success({ id: 'p1', updated: true }),
      );
      const response = await request(app)
        .put('/players/p1')
        .send({ username: 'new' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /players/:id', () => {
    it('should delete player', async () => {
      mockPlayerService.deletePlayer.mockResolvedValue(Result.success(true));
      const response = await request(app).delete('/players/p1');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Player deleted successfully');
    });
  });
});
