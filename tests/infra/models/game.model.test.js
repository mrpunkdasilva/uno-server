import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import Game from '../../../src/infra/models/game.model.js';

describe('Game Model Instance Methods', () => {
  let gameInstance;

  beforeEach(() => {
    const player1ObjectId = new mongoose.Types.ObjectId();
    const player2ObjectId = new mongoose.Types.ObjectId();

    gameInstance = new Game({
      title: 'Test Game',
      rules: 'Standard rules',
      creatorId: player1ObjectId,
      status: 'Active',
      maxPlayers: 4,
      minPlayers: 2,
      players: [
        { _id: player1ObjectId, ready: true, position: 0, hand: [] },
        { _id: player2ObjectId, ready: true, position: 1, hand: [] },
      ],
      currentPlayerIndex: 0,
      turnDirection: 1,
      currentColor: 'red',
      discardPile: [],
      initialCard: { color: 'blue', value: '0', type: 'number' },
      deck: [],
    });

    gameInstance.save = jest.fn().mockResolvedValue(gameInstance);
  });

  describe('advanceTurn', () => {
    it('should advance to the next player clockwise', () => {
      gameInstance.currentPlayerIndex = 0;
      gameInstance.turnDirection = 1;
      gameInstance.players = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
      gameInstance.advanceTurn();
      expect(gameInstance.currentPlayerIndex).toBe(1);
    });

    it('should wrap around to the first player when advancing past the last player clockwise', () => {
      gameInstance.currentPlayerIndex = 2;
      gameInstance.turnDirection = 1;
      gameInstance.players = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
      gameInstance.advanceTurn();
      expect(gameInstance.currentPlayerIndex).toBe(0);
    });

    it('should advance to the previous player counter-clockwise', () => {
      gameInstance.currentPlayerIndex = 1;
      gameInstance.turnDirection = -1;
      gameInstance.players = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
      gameInstance.advanceTurn();
      expect(gameInstance.currentPlayerIndex).toBe(0);
    });

    it('should wrap around to the last player when advancing past the first player counter-clockwise', () => {
      gameInstance.currentPlayerIndex = 0;
      gameInstance.turnDirection = -1;
      gameInstance.players = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
      gameInstance.advanceTurn();
      expect(gameInstance.currentPlayerIndex).toBe(2);
    });

    it('should do nothing if there are no players', () => {
      gameInstance.players = [];
      gameInstance.currentPlayerIndex = 0;
      gameInstance.advanceTurn();
      expect(gameInstance.currentPlayerIndex).toBe(0);
    });
  });

  describe('reverseDirection', () => {
    it('should change turn direction from clockwise to counter-clockwise', () => {
      gameInstance.turnDirection = 1;
      gameInstance.reverseDirection();
      expect(gameInstance.turnDirection).toBe(-1);
    });

    it('should change turn direction from counter-clockwise to clockwise', () => {
      gameInstance.turnDirection = -1;
      gameInstance.reverseDirection();
      expect(gameInstance.turnDirection).toBe(1);
    });
  });

  describe('getNextPlayer', () => {
    it('should return the next player in clockwise direction', () => {
      gameInstance.currentPlayerIndex = 0;
      gameInstance.turnDirection = 1;

      const player1 = {
        _id: gameInstance.players[0]._id,
        ready: true,
        position: 0,
        hand: [],
      };
      const player2 = {
        _id: gameInstance.players[1]._id,
        ready: true,
        position: 1,
        hand: [],
      };
      gameInstance.players = [player1, player2];
      const nextPlayer = gameInstance.getNextPlayer();
      expect(nextPlayer).toEqual(expect.objectContaining(player2));
    });

    it('should return the next player in counter-clockwise direction', () => {
      gameInstance.currentPlayerIndex = 1;
      gameInstance.turnDirection = -1;

      const player1 = {
        _id: gameInstance.players[0]._id,
        ready: true,
        position: 0,
        hand: [],
      };
      const player2 = {
        _id: gameInstance.players[1]._id,
        ready: true,
        position: 1,
        hand: [],
      };
      gameInstance.players = [player1, player2];
      const nextPlayer = gameInstance.getNextPlayer();
      expect(nextPlayer).toEqual(expect.objectContaining(player1));
    });

    it('should return null if there are no players', () => {
      gameInstance.players = [];
      const nextPlayer = gameInstance.getNextPlayer();
      expect(nextPlayer).toBeNull();
    });

    it('should wrap around correctly in getNextPlayer clockwise', () => {
      gameInstance.currentPlayerIndex = 1;
      gameInstance.turnDirection = 1;

      const player1 = {
        _id: gameInstance.players[0]._id,
        ready: true,
        position: 0,
        hand: [],
      };
      const player2 = {
        _id: gameInstance.players[1]._id,
        ready: true,
        position: 1,
        hand: [],
      };
      gameInstance.players = [player1, player2];
      const nextPlayer = gameInstance.getNextPlayer();
      expect(nextPlayer).toEqual(expect.objectContaining(player1));
    });

    it('should wrap around correctly in getNextPlayer counter-clockwise', () => {
      gameInstance.currentPlayerIndex = 0;
      gameInstance.turnDirection = -1;

      const player1 = {
        _id: gameInstance.players[0]._id,
        ready: true,
        position: 0,
        hand: [],
      };
      const player2 = {
        _id: gameInstance.players[1]._id,
        ready: true,
        position: 1,
        hand: [],
      };
      gameInstance.players = [player1, player2];
      const nextPlayer = gameInstance.getNextPlayer();
      expect(nextPlayer).toEqual(expect.objectContaining(player2));
    });
  });

  describe('setCurrentColor', () => {
    it('should set the current color of the game', () => {
      gameInstance.currentColor = 'red';
      gameInstance.setCurrentColor('green');
      expect(gameInstance.currentColor).toBe('green');
    });

    it('should allow setting null as current color', () => {
      gameInstance.currentColor = 'red';
      gameInstance.setCurrentColor(null);
      expect(gameInstance.currentColor).toBeNull();
    });
  });

  describe('Schema Properties', () => {
    it('should correctly store and retrieve currentPlayerIndex', async () => {
      gameInstance.currentPlayerIndex = 1;
      await gameInstance.save();
      expect(gameInstance.currentPlayerIndex).toBe(1);
    });

    it('should correctly store and retrieve turnDirection', async () => {
      gameInstance.turnDirection = -1;
      await gameInstance.save();
      expect(gameInstance.turnDirection).toBe(-1);
    });

    it('should correctly store and retrieve currentColor', async () => {
      gameInstance.currentColor = 'yellow';
      await gameInstance.save();
      expect(gameInstance.currentColor).toBe('yellow');
    });

    it('should correctly store and retrieve discardPile', async () => {
      const card = { cardId: 'c1', color: 'red', value: '1', type: 'number' };
      gameInstance.discardPile.push(card);
      await gameInstance.save();
      expect(gameInstance.discardPile).toEqual([expect.objectContaining(card)]);
    });

    it('should correctly store and retrieve initialCard', async () => {
      const initial = { color: 'green', value: '2', type: 'number' };
      gameInstance.initialCard = initial;
      await gameInstance.save();
      expect(gameInstance.initialCard).toEqual(initial);
    });

    it('should correctly store and retrieve deck', async () => {
      const deckCard = {
        cardId: 'd1',
        color: 'blue',
        value: '3',
        type: 'number',
      };
      gameInstance.deck.push(deckCard);
      await gameInstance.save();
      expect(gameInstance.deck).toEqual([expect.objectContaining(deckCard)]);
    });

    it('should correctly store and retrieve hand for players', async () => {
      const handCard = {
        cardId: 'h1',
        color: 'yellow',
        value: '4',
        type: 'number',
      };
      gameInstance.players[0].hand.push(handCard);
      await gameInstance.save();
      expect(gameInstance.players[0].hand).toEqual([handCard]);
    });
  });
});
