import request from 'supertest';
import express from 'express';
import GameController from '../../../src/presentation/controllers/game.controller.js';

describe('Game Routes - POST /nextTurn', () => {
  let app;
  let mockGameService;
  let mockGameHistoryService;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockGameService = {};
    mockGameHistoryService = {};
    const controller = new GameController(
      mockGameService,
      mockGameHistoryService,
    );

    app.post('/api/games/nextTurn', controller.nextTurn.bind(controller));
  });

  it('should return next player Charlie (index 2) when current is Bob (index 1)', async () => {
    const body = {
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
      currentPlayerIndex: 1,
    };

    const response = await request(app).post('/api/games/nextTurn').send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      nextPlayerIndex: 2,
      nextPlayer: 'Charlie',
    });
  });

  it('should return 400 if players or currentIndex are missing', async () => {
    const response = await request(app)
      .post('/api/games/nextTurn')
      .send({ players: [] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
