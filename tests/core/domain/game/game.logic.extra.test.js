import * as GameLogic from '../../../../src/core/domain/game/game.logic.js';

describe('GameLogic Extra Coverage Tests', () => {
  describe('formatCardForDisplay', () => {
    it('should return Unknown Card if card is null', () => {
      expect(GameLogic.formatCardForDisplay(null)).toBe('Unknown Card');
    });

    it('should use maps for color and value', () => {
      const card = { color: 'red', value: 'skip' };
      // Assuming red -> Red, skip -> Skip or similar in maps
      const result = GameLogic.formatCardForDisplay(card);
      expect(result).toContain('Red');
      expect(result).toContain('Skip');
    });
  });

  describe('buildPlayerHandResponse', () => {
    it('should format player hand response correctly', () => {
      const hand = [{ color: 'blue', value: '0' }];
      const result = GameLogic.buildPlayerHandResponse('p1', hand);
      expect(result.player).toBe('p1');
      expect(result.hand).toHaveLength(1);
      expect(result.hand[0]).toMatchObject({
        color: 'blue',
        value: '0',
        displayName: expect.stringContaining('Blue Zero'),
      });
    });
  });

  describe('extractPlayerHand', () => {
    it('should return failure if gameData is null', () => {
      const result = GameLogic.extractPlayerHand(null, 'p1');
      expect(result.isFailure).toBe(true);
      expect(result.error.message).toBe('No hand data available');
    });

    it('should return failure if hand is missing', () => {
      const result = GameLogic.extractPlayerHand({}, 'p1');
      expect(result.isFailure).toBe(true);
    });

    it('should return success if hand exists', () => {
      const gameData = { hand: ['c1'] };
      const result = GameLogic.extractPlayerHand(gameData, 'p1');
      expect(result.isSuccess).toBe(true);
      expect(result.value.hand).toEqual(['c1']);
    });
  });

  describe('hasPlayableCards', () => {
    it('should return false if hand is missing or empty', () => {
      expect(GameLogic.hasPlayableCards({ color: 'red' }, null)).toBe(false);
      expect(GameLogic.hasPlayableCards({ color: 'red' }, [])).toBe(false);
    });

    it('should return true if at least one card is playable', () => {
      const top = { color: 'red', value: '5' };
      const hand = [
        { color: 'blue', value: '5' },
        { color: 'green', value: '1' },
      ];
      expect(GameLogic.hasPlayableCards(top, hand)).toBe(true);
    });
  });

  describe('drawCard', () => {
    it('should return null if deck is empty', () => {
      const game = { deck: [] };
      expect(GameLogic.drawCard(game, 'p1')).toBeNull();
    });

    it('should draw a card and add to player hand', () => {
      const game = {
        deck: [{ color: 'red', value: '1' }],
        players: [{ _id: { toString: () => 'p1' }, hand: [] }],
      };
      const card = GameLogic.drawCard(game, 'p1');
      expect(card.color).toBe('red');
      expect(game.deck).toHaveLength(0);
      expect(game.players[0].hand).toHaveLength(1);
    });

    it('should initialize hand if it is missing during draw', () => {
      const game = {
        deck: [{ color: 'red', value: '1' }],
        players: [
          { _id: { toString: () => 'p1' } }, // No hand property
        ],
      };
      GameLogic.drawCard(game, 'p1');
      expect(game.players[0].hand).toBeDefined();
      expect(game.players[0].hand).toHaveLength(1);
    });

    it('should still draw card even if player not found in game', () => {
      const game = {
        deck: [{ color: 'blue', value: '2' }],
        players: [],
      };
      const card = GameLogic.drawCard(game, 'p99');
      expect(card).toBeDefined();
      expect(game.deck).toHaveLength(0);
    });
  });
});
