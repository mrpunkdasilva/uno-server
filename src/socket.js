import { Server } from 'socket.io';
import logger from './config/logger.js';

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    socket.on('join_game', async (data) => {
      try {
        // Expected data format: { action: "join", playerName: "NewPlayer", gameId: "optional_room_id" }
        // Default to a global room if no gameId provided for simple testing
        const roomName = data.gameId || 'global_game_room';
        const playerName = data.playerName;

        if (!playerName) {
          socket.emit('error', { message: 'Player name is required.' });
          return;
        }

        await socket.join(roomName);

        // Store player name in socket data for retrieval
        socket.data.playerName = playerName;

        // Retrieve all players in the room
        const socketsInRoom = await io.in(roomName).fetchSockets();
        const playerNames = socketsInRoom
          .map((s) => s.data.playerName)
          .filter(Boolean);

        const response = {
          message: `${playerName} has joined the game.`,
          players: playerNames,
        };

        // Broadcast to everyone in the room including the sender
        io.to(roomName).emit('player_joined', response);

        logger.info(`Player ${playerName} joined room ${roomName}`);
      } catch (error) {
        logger.error(`Error in join_game: ${error.message}`);
        socket.emit('error', { message: 'Failed to join game.' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      // Ideally, handle player leaving logic here too
    });
  });

  return io;
};
