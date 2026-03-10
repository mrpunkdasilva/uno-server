import {
  calculateSkipResult,
  buildSkipResponse,
} from '../../../src/core/utils/skip.utils.js';

describe('skip.utils', () => {
  const players = [
    { id: 'p1', username: 'User1' },
    { id: 'p2', username: 'User2' },
    { id: 'p3', username: 'User3' },
  ];

  describe('calculateSkipResult', () => {
    it('should calculate skip correctly in clockwise direction', () => {
      const result = calculateSkipResult(0, players, 'clockwise');

      expect(result.skippedPlayerIndex).toBe(1);
      expect(result.skippedPlayer).toBe('User2');
      expect(result.nextPlayerIndex).toBe(2);
      expect(result.nextPlayer).toBe('User3');
    });

    it('should calculate skip correctly in counter-clockwise direction', () => {
      const result = calculateSkipResult(0, players, 'counter-clockwise');

      // index 0 -> skip index 2 -> next index 1
      expect(result.skippedPlayerIndex).toBe(2);
      expect(result.skippedPlayer).toBe('User3');
      expect(result.nextPlayerIndex).toBe(1);
      expect(result.nextPlayer).toBe('User2');
    });

    it('should use id if username is missing', () => {
      const playersNoUser = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }];
      const result = calculateSkipResult(0, playersNoUser, 'clockwise');

      expect(result.skippedPlayer).toBe('p2');
      expect(result.nextPlayer).toBe('p3');
    });

    it('should handle wrapping around the array', () => {
      const result = calculateSkipResult(2, players, 'clockwise');

      expect(result.skippedPlayerIndex).toBe(0);
      expect(result.nextPlayerIndex).toBe(1);
    });
  });

  describe('buildSkipResponse', () => {
    it('should format skip response correctly', () => {
      const skipResult = {
        nextPlayerIndex: 2,
        nextPlayer: 'User3',
        skippedPlayer: 'User2',
      };

      const response = buildSkipResponse(skipResult);

      expect(response).toEqual({
        status: 200,
        body: {
          nextPlayerIndex: 2,
          nextPlayer: 'User3',
          skippedPlayer: 'User2',
        },
      });
    });
  });
});
