import * as GameMocks from '../../src/mocks/game.mocks.js';
import * as PlayerMocks from '../../src/mocks/player.mocks.js';

describe('Mocks Coverage Extra', () => {
  describe('Game Mocks', () => {
    it('should test game mock _id toString', () => {
      expect(GameMocks.mockGame._id.toString()).toBe('123');
    });

    it('should test resetAllMocks', () => {
      GameMocks.mockGameRepository.findById.mockReturnValue('test');
      GameMocks.resetAllMocks();
      expect(GameMocks.mockGameRepository.findById).not.toHaveBeenCalled();
    });

    it('should test setupDefaultMocks', () => {
      const mocks = GameMocks.setupDefaultMocks();
      expect(mocks.gameRepository).toBeDefined();
      expect(GameMocks.mockSchemas.gameResponseDtoSchema.parse()).toEqual(
        GameMocks.mockParsedGame,
      );
    });

    it('should test mockPlayerWithHand', () => {
      const player = GameMocks.mockPlayerWithHand('p1', ['c1']);
      expect(player._id).toBe('p1');
      expect(player.hand).toEqual(['c1']);
    });

    it('should test mockGameActiveWithPlayersAndCards default params', () => {
      const game = GameMocks.mockGameActiveWithPlayersAndCards();
      expect(game.status).toBe('Active');
      expect(game.players).toHaveLength(0);
    });

    it('should test mockGameActiveWithPlayersAndCards with players', () => {
      const game = GameMocks.mockGameActiveWithPlayersAndCards({
        players: [{ _id: 'p1', ready: true, position: 1, hand: [] }],
      });
      expect(game.players).toHaveLength(1);
      expect(game.players[0]._id).toBe('p1');
    });
  });

  describe('Player Mocks', () => {
    it('should test player mock _id toString', () => {
      expect(PlayerMocks.mockPlayerDoc._id.toString()).toBe(
        '507f1f77bcf86cd799439011',
      );
      expect(PlayerMocks.mockPlayerDoc2._id.toString()).toBe(
        '507f1f77bcf86cd799439012',
      );
      expect(PlayerMocks.mockPlayerDoc3._id.toString()).toBe(
        '507f1f77bcf86cd799439013',
      );
      expect(PlayerMocks.mockCreatedPlayerDoc._id.toString()).toBe(
        '507f1f77bcf86cd799439014',
      );
    });

    it('should test toObject conversion', () => {
      const obj = PlayerMocks.mockPlayerDoc.toObject();
      expect(obj.username).toBe('player1');
    });

    it('should test resetAllMocks', () => {
      PlayerMocks.mockPlayerRepository.findById.mockReturnValue('test');
      PlayerMocks.resetAllMocks();
      expect(PlayerMocks.mockPlayerRepository.findById).not.toHaveBeenCalled();
    });

    it('should test setupDefaultMocks', () => {
      const mocks = PlayerMocks.setupDefaultMocks();
      expect(mocks.playerRepository).toBeDefined();
      const result = PlayerMocks.mockSchemas.playerResponseDtoSchema.parse({
        _id: { toString: () => 'id1' },
        username: 'u1',
      });
      expect(result.id).toBe('id1');
    });
  });
});
