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
    const gameId = 'test_game_1';
    clientSocket.emit('join_game', {
      action: 'join',
      playerName: 'NewPlayer',
      gameId,
    });

    clientSocket.once('player_joined', (data) => {
      try {
        expect(data.message).toBe('NewPlayer has joined the game.');
        expect(data.players).toContain('NewPlayer');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  test('should allow multiple players to join and see the updated list', (done) => {
    const gameId = 'test_game_2';
    const client2 = new Client(clientSocket.io.uri);

    client2.on('connect', () => {
      // Usar .once ou remover ouvintes antigos é crucial
      clientSocket.removeAllListeners('player_joined');

      clientSocket.emit('join_game', {
        action: 'join',
        playerName: 'Player1',
        gameId,
      });

      clientSocket.on('player_joined', (data) => {
        if (data.players.length === 1 && data.players.includes('Player1')) {
          client2.emit('join_game', {
            action: 'join',
            playerName: 'Player2',
            gameId,
          });
        } else if (data.players.length === 2) {
          try {
            expect(data.players).toContain('Player1');
            expect(data.players).toContain('Player2');
            client2.close();
            done();
          } catch (error) {
            client2.close();
            done(error);
          }
        }
      });
    });
  });
});
