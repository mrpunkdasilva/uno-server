// Mocks for Game objects
export const mockGame = {
  _id: { toString: () => '507f1f77bcf86cd799439011' }, // Simulate ObjectId
  title: 'Test Game',
  rules: 'These are the test game rules.', // Added rules
  status: 'Waiting',
  maxPlayers: 4,
  minPlayers: 2,
  creatorId: 'creator123',
  players: [
    { _id: 'creator123', ready: true, position: 1 },
    { _id: 'player456', ready: false, position: 2 },
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockParsedGame = {
  id: '507f1f77bcf86cd799439011',
  title: 'Test Game',
  rules: 'These are the test game rules.', // Added rules
  status: 'Waiting',
  maxPlayers: 4,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};
