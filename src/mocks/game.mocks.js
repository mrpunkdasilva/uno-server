export const mockGame = {
  _id: { toString: () => '123' },
  title: 'Test Game',
  rules: 'Test rules for the game',
  status: 'Waiting',
  maxPlayers: 4,
  minPlayers: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  creatorId: 'creator123',
  players: [
    {
      _id: 'creator123',
      ready: true,
      position: 1,
    },
  ],
  winnerId: null,
  endedAt: null,
};

export const mockParsedGame = {
  id: '123',
  title: 'Test Game',
  rules: 'Test rules for the game',
  status: 'Waiting',
  maxPlayers: 4,
  createdAt: mockGame.createdAt,
  updatedAt: mockGame.updatedAt,
};

// IDs e dados para getGamePlayers
export const mockGameId = '60d21b4667d0d8992e610c85';
export const mockPlayerId1 = '60d21b4667d0d8992e610c86';
export const mockPlayerId2 = '60d21b4667d0d8992e610c87';

export const mockGameData = {
  _id: mockGameId,
  title: 'UNO Game Test',
  status: 'Waiting',
  maxPlayers: 4,
  players: [
    { _id: mockPlayerId1, ready: true, position: 1 },
    { _id: mockPlayerId2, ready: false, position: 2 },
  ],
};

export const mockPlayer1 = {
  _id: mockPlayerId1,
  username: 'player1',
  email: 'player1@example.com',
};

export const mockPlayer2 = {
  _id: mockPlayerId2,
  username: 'player2',
  email: 'player2@example.com',
};

// Dados para createGame
export const mockCreateGameData = {
  name: 'New Game',
  rules: 'Some default rules for the test game.',
  maxPlayers: 4,
};

export const mockUserId = 'user123';

// Dados para updateGame
export const mockGameIdForUpdate = '123';
export const mockUpdateData = { title: 'Updated Title', status: 'Active' };

// Dados para deleteGame
export const mockGameIdForDelete = '123';

// Dados para joinGame
export const mockJoinGameUserId = 'newPlayer123';
export const mockJoinGameId = 'game123';

// Dados para setPlayerReady
export const mockReadyUserId = 'player123';
export const mockReadyGameId = 'game123';

// Dados para startGame
export const mockCreatorId = 'creator123';
export const mockStartGameId = 'game123';
export const mockGameWithAllReady = {
  ...mockGame,
  _id: mockStartGameId,
  creatorId: mockCreatorId,
  players: [
    { _id: 'player1', ready: true, position: 0 },
    { _id: 'player2', ready: true, position: 0 },
    { _id: 'player3', ready: true, position: 0 },
  ],
  minPlayers: 2,
};

// Dados para abandonGame
export const mockAbandonUserId = 'player123';
export const mockAbandonGameId = 'game123';
export const mockActiveGame = {
  ...mockGame,
  _id: mockAbandonGameId,
  status: 'Active',
  players: [
    { _id: mockAbandonUserId, ready: true, position: 1 },
    { _id: 'player456', ready: true, position: 2 },
    { _id: 'player789', ready: true, position: 3 },
  ],
};

export const mockGameNotActive = {
  ...mockGame,
  _id: mockAbandonGameId,
  status: 'Waiting', // Não está Active
  players: [
    { _id: mockAbandonUserId, ready: true, position: 1 }, // Jogador está presente
    { _id: 'player456', ready: true, position: 2 },
  ],
};

// Dados para getGameStatus
export const mockStatusGameId = 'game123';
export const mockGameStatus = {
  _id: mockStatusGameId,
  status: 'Active',
};

// Repository mocks
export const mockGameRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  createGame: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  save: jest.fn(),
  findGameStatus: jest.fn(),
  findDiscardTop: jest.fn(),
  findRecentDiscards: jest.fn(),
};

export const mockPlayerRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Logger mock
export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Schema mocks
export const mockSchemas = {
  gameResponseDtoSchema: {
    parse: jest.fn(),
  },
  updateGameDtoSchema: {
    parse: jest.fn(),
  },
  createGameDtoSchema: {
    parse: jest.fn(),
  },
};

// Função para resetar todos os mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();

  // Resetar repository mocks
  Object.values(mockGameRepository).forEach((mock) => mock.mockClear?.());
  Object.values(mockPlayerRepository).forEach((mock) => mock.mockClear?.());

  // Resetar logger mocks
  Object.values(mockLogger).forEach((mock) => mock.mockClear?.());

  // Resetar schema mocks
  Object.values(mockSchemas).forEach((schema) => {
    if (schema.parse && typeof schema.parse.mockClear === 'function') {
      schema.parse.mockClear();
    }
  });
};

// Função para configurar mocks padrão
export const setupDefaultMocks = () => {
  // Configurar valores padrão para os schemas
  mockSchemas.gameResponseDtoSchema.parse.mockReturnValue(mockParsedGame);
  mockSchemas.updateGameDtoSchema.parse.mockImplementation((data) => data);
  mockSchemas.createGameDtoSchema.parse.mockImplementation((data) => data);

  return {
    gameRepository: mockGameRepository,
    playerRepository: mockPlayerRepository,
    logger: mockLogger,
    schemas: mockSchemas,
  };
};
