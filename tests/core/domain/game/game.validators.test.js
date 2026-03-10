import * as Validators from '../../../../src/core/domain/game/game.validators.js';
import { GameStatus } from '../../../../src/core/enums/game.enum.js';

describe('Game Validators', () => {
  describe('validateGameId', () => {
    it('should success for valid string', () => {
      const result = Validators.validateGameId('  game123  ');
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('game123');
    });

    it('should fail for empty or non-string', () => {
      expect(Validators.validateGameId(null).isFailure).toBe(true);
      expect(Validators.validateGameId('').isFailure).toBe(true);
      expect(Validators.validateGameId('   ').isFailure).toBe(true);
      expect(Validators.validateGameId(123).isFailure).toBe(true);
    });
  });

  describe('validateGameIsWaiting', () => {
    it('should success if waiting', () => {
      const game = { status: GameStatus.WAITING };
      expect(Validators.validateGameIsWaiting(game).isSuccess).toBe(true);
    });

    it('should fail if not waiting', () => {
      const game = { status: GameStatus.ACTIVE };
      expect(Validators.validateGameIsWaiting(game).isFailure).toBe(true);
    });
  });

  describe('validateGameNotFull', () => {
    it('should success if not full', () => {
      const game = { players: [1, 2], maxPlayers: 4 };
      expect(Validators.validateGameNotFull(game).isSuccess).toBe(true);
    });

    it('should fail if full', () => {
      const game = { players: [1, 2, 3, 4], maxPlayers: 4 };
      expect(Validators.validateGameNotFull(game).isFailure).toBe(true);
    });
  });

  describe('validateUserNotInGame', () => {
    it('should success if user not in game', () => {
      const game = { players: [{ _id: 'p1' }] };
      const validator = Validators.validateUserNotInGame('p2');
      expect(validator(game).isSuccess).toBe(true);
    });

    it('should fail if user already in game', () => {
      const game = { players: [{ _id: 'p1' }] };
      const validator = Validators.validateUserNotInGame('p1');
      expect(validator(game).isFailure).toBe(true);
    });
  });

  describe('validateIsCreator', () => {
    it('should success if user is creator', () => {
      const game = { creatorId: 'user1' };
      const validator = Validators.validateIsCreator('user1');
      expect(validator(game).isSuccess).toBe(true);
    });

    it('should fail if user is not creator', () => {
      const game = { creatorId: 'user1' };
      const validator = Validators.validateIsCreator('user2');
      expect(validator(game).isFailure).toBe(true);
    });
  });

  describe('validateGameNotStarted', () => {
    it('should success if status is not active', () => {
      const game = { status: GameStatus.WAITING };
      expect(Validators.validateGameNotStarted(game).isSuccess).toBe(true);
    });

    it('should fail if status is active', () => {
      const game = { status: GameStatus.ACTIVE };
      expect(Validators.validateGameNotStarted(game).isFailure).toBe(true);
    });
  });

  describe('validateMinimumPlayers', () => {
    it('should success if players >= minPlayers', () => {
      const game = { players: [1, 2], minPlayers: 2 };
      expect(Validators.validateMinimumPlayers(game).isSuccess).toBe(true);
    });

    it('should fail if players < minPlayers', () => {
      const game = { players: [1], minPlayers: 2 };
      expect(Validators.validateMinimumPlayers(game).isFailure).toBe(true);
    });
  });

  describe('validateAllPlayersReady', () => {
    it('should success if all ready', () => {
      const game = { players: [{ ready: true }, { ready: true }] };
      expect(Validators.validateAllPlayersReady(game).isSuccess).toBe(true);
    });

    it('should fail if any not ready', () => {
      const game = { players: [{ ready: true }, { ready: false }] };
      expect(Validators.validateAllPlayersReady(game).isFailure).toBe(true);
    });
  });

  describe('validateUserInGame', () => {
    it('should success if user in game', () => {
      const game = { players: [{ _id: 'p1' }] };
      const validator = Validators.validateUserInGame('p1');
      expect(validator(game).isSuccess).toBe(true);
    });

    it('should fail if user not in game', () => {
      const game = { players: [{ _id: 'p1' }] };
      const validator = Validators.validateUserInGame('p2');
      expect(validator(game).isFailure).toBe(true);
    });
  });

  describe('validateGameIsActive', () => {
    it('should success if active', () => {
      const game = { status: GameStatus.ACTIVE };
      expect(Validators.validateGameIsActive(game).isSuccess).toBe(true);
    });

    it('should fail if not active', () => {
      const game = { status: GameStatus.WAITING };
      expect(Validators.validateGameIsActive(game).isFailure).toBe(true);
    });
  });

  describe('validateGameHasStarted', () => {
    it('should success if not in waiting', () => {
      const game = { status: GameStatus.ACTIVE };
      expect(Validators.validateGameHasStarted(game).isSuccess).toBe(true);
    });

    it('should fail if waiting', () => {
      const game = { status: GameStatus.WAITING };
      expect(Validators.validateGameHasStarted(game).isFailure).toBe(true);
    });
  });

  describe('validateGameHasPlayers', () => {
    it('should success if has players', () => {
      const game = { players: [1] };
      expect(Validators.validateGameHasPlayers(game).isSuccess).toBe(true);
    });

    it('should fail if empty or null players', () => {
      expect(Validators.validateGameHasPlayers({ players: [] }).isFailure).toBe(
        true,
      );
      expect(Validators.validateGameHasPlayers({}).isFailure).toBe(true);
    });
  });

  describe('validateIsCurrentPlayer', () => {
    it('should success if user is current player', () => {
      const game = { players: [{ _id: 'p1' }], currentPlayerIndex: 0 };
      const validator = Validators.validateIsCurrentPlayer('p1');
      expect(validator(game).isSuccess).toBe(true);
    });

    it('should fail if user is not current player', () => {
      const game = {
        players: [{ _id: 'p1' }, { _id: 'p2' }],
        currentPlayerIndex: 1,
      };
      const validator = Validators.validateIsCurrentPlayer('p1');
      expect(validator(game).isFailure).toBe(true);
    });

    it('should fail if current player index invalid', () => {
      const game = { players: [{ _id: 'p1' }], currentPlayerIndex: 5 };
      const validator = Validators.validateIsCurrentPlayer('p1');
      expect(validator(game).isFailure).toBe(true);
    });
  });

  describe('validatePlayerHasCard', () => {
    it('should success if player has card', () => {
      const game = {
        players: [{ _id: 'p1', hand: [{ cardId: 'c1', value: '5' }] }],
      };
      const validator = Validators.validatePlayerHasCard('p1', 'c1');
      const result = validator(game);
      expect(result.isSuccess).toBe(true);
      expect(result.value.cardToPlay.cardId).toBe('c1');
    });

    it('should fail if player not found', () => {
      const game = { players: [{ _id: 'p1', hand: [] }] };
      const validator = Validators.validatePlayerHasCard('p2', 'c1');
      expect(validator(game).isFailure).toBe(true);
    });

    it('should fail if card not in hand', () => {
      const game = {
        players: [{ _id: 'p1', hand: [{ cardId: 'c2' }] }],
      };
      const validator = Validators.validatePlayerHasCard('p1', 'c1');
      expect(validator(game).isFailure).toBe(true);
    });
  });

  describe('validatePlayerHasHand', () => {
    it('should success if has cards', () => {
      const data = { hand: [1] };
      expect(Validators.validatePlayerHasHand(data).isSuccess).toBe(true);
    });

    it('should fail if hand empty or missing', () => {
      expect(Validators.validatePlayerHasHand({ hand: [] }).isFailure).toBe(
        true,
      );
      expect(Validators.validatePlayerHasHand({}).isFailure).toBe(true);
    });
  });

  describe('validateUserMatchesPlayer', () => {
    it('should success if IDs match', () => {
      expect(Validators.validateUserMatchesPlayer('id1', 'id1').isSuccess).toBe(
        true,
      );
    });

    it('should fail if IDs do not match', () => {
      expect(Validators.validateUserMatchesPlayer('id1', 'id2').isFailure).toBe(
        true,
      );
    });
  });
});
