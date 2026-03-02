import { calculateNextTurn } from '../../../../src/core/domain/game/game.logic.js';

describe('GameDomain Logic - calculateNextTurn', () => {
  const players = ['Alice', 'Bob', 'Charlie', 'Diana'];

  it('should return Bob (index 1) when current is Alice (index 0) in clockwise direction', () => {
    const result = calculateNextTurn(players, 0, 1);
    expect(result).toEqual({
      nextPlayerIndex: 1,
      nextPlayer: 'Bob',
    });
  });

  it('should return Charlie (index 2) when current is Bob (index 1) in clockwise direction', () => {
    const result = calculateNextTurn(players, 1, 1);
    expect(result).toEqual({
      nextPlayerIndex: 2,
      nextPlayer: 'Charlie',
    });
  });

  it('should wrap around to Alice (index 0) when current is Diana (index 3) in clockwise direction', () => {
    const result = calculateNextTurn(players, 3, 1);
    expect(result).toEqual({
      nextPlayerIndex: 0,
      nextPlayer: 'Alice',
    });
  });

  it('should handle counter-clockwise direction (direction = -1)', () => {
    const result = calculateNextTurn(players, 0, -1);
    expect(result).toEqual({
      nextPlayerIndex: 3,
      nextPlayer: 'Diana',
    });
  });

  it('should handle player objects with username', () => {
    const playerObjects = [
      { _id: '1', username: 'Alice' },
      { _id: '2', username: 'Bob' },
    ];
    const result = calculateNextTurn(playerObjects, 0, 1);
    expect(result).toEqual({
      nextPlayerIndex: 1,
      nextPlayer: 'Bob',
    });
  });
});
