import { createServer } from 'http';
import Client from 'socket.io-client';
import { initializeSocket } from '../src/socket.js';

describe('WebSocket Server', () => {
  let io, clientSocket, httpServer;

  beforeAll((done) => {
    httpServer = createServer();
    io = initializeSocket(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  test('should allow a player to join and broadcast the list', (done) => {
    clientSocket.emit('join_game', { playerName: 'NewPlayer' });

    clientSocket.on('player_joined', (data) => {
      try {
        expect(data.message).toBe('NewPlayer has joined the game.');
        expect(data.players).toContain('NewPlayer');
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});
