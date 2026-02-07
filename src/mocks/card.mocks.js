export const mockCardDoc = {
  _id: '507f1f77bcf86cd799439011',
  color: 'red',
  type: 'number',
  number: 5,
  gameId: 'game-123',
  isInDeck: true,
  isDiscarded: false,
  toObject: jest.fn().mockReturnValue({
    _id: '507f1f77bcf86cd799439011',
    color: 'red',
    type: 'number',
    number: 5,
    gameId: 'game-123',
    isInDeck: true,
    isDiscarded: false,
  }),
};
