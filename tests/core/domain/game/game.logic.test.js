import {
  addPlayer,
  markPlayerAsReady,
  startGame,
  createInitialGame,
  createEndGamePayload,
  hasPlayerWon,
  buildJoinGameSuccessResponse,
  buildSetPlayerReadySuccessResponse,
  buildAdvanceTurnSuccessResponse,
  getCurrentPlayer,
  advanceTurn,
  abandonGame,
  removePlayerFromGame,
  determinePostAbandonmentAction,
  buildAbandonGameSuccessResponse,
  buildGetDiscardTopResponse,
  buildDiscardTopSimpleResponse,
  buildGamePlayersResponse,
  buildPlayerDetails,
  applyCardPlayEffects,
  checkWinConditionAndGetOutcome,
  buildPlayCardSuccessMessage,
} from '../../../../src/core/domain/game/game.logic.js';
import { GameStatus, PostAbandonmentAction, PostPlayAction } from '../../../../src/core/enums/game.enum.js';
import { CouldNotDetermineCurrentPlayerError } from '../../../../src/core/errors/game.errors.js';
import { Result } from '../../../../src/core/utils/Result.js';

describe('GameDomain Logic', () => {
  let mockGame;
  const userId = 'user-1';
  const gameId = 'game-1';

  beforeEach(() => {
    mockGame = {
      _id: gameId,
      title: 'Test Game',
      rules: 'Some game rules with at least 10 characters',
      status: GameStatus.WAITING,
      creatorId: userId,
      players: [{ _id: userId, ready: true, position: 1 }],
      minPlayers: 2,
      maxPlayers: 4,
      currentPlayerIndex: 0,
      turnDirection: 1,
      discardPile: [],
      initialCard: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('addPlayer', () => {
    it('should add a new player to the game', () => {
      const newPlayerId = 'user-2';
      const initialPlayerCount = mockGame.players.length;
      const updatedGame = addPlayer(mockGame, newPlayerId);

      expect(updatedGame.players).toHaveLength(initialPlayerCount + 1);
      expect(updatedGame.players[initialPlayerCount]).toEqual({
        _id: newPlayerId,
        ready: false,
        position: 0,
      });
    });
  });

  describe('markPlayerAsReady', () => {
    it('should mark an existing player as ready', () => {
      const playerToMarkReady = 'user-2';
      mockGame.players.push({ _id: playerToMarkReady, ready: false, position: 2 });
      const updatedGame = markPlayerAsReady(mockGame, playerToMarkReady);

      const player = updatedGame.players.find(p => p._id === playerToMarkReady);
      expect(player.ready).toBe(true);
    });

    it('should not change ready status if player does not exist', () => {
      const initialPlayerReadyStatus = mockGame.players[0].ready;
      const updatedGame = markPlayerAsReady(mockGame, 'non-existent-user');
      expect(updatedGame.players[0].ready).toBe(initialPlayerReadyStatus);
    });
  });

  describe('startGame', () => {
    it('should set game status to ACTIVE, reset currentPlayerIndex, set turnDirection, and assign player positions', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 0 });
      const updatedGame = startGame(mockGame);

      expect(updatedGame.status).toBe(GameStatus.ACTIVE);
      expect(updatedGame.currentPlayerIndex).toBe(0);
      expect(updatedGame.turnDirection).toBe(1);
      expect(updatedGame.players[0].position).toBe(1);
      expect(updatedGame.players[1].position).toBe(2);
    });
  });

  describe('createInitialGame', () => {
    it('should create initial game data structure', () => {
      const gameData = {
        name: 'New Game',
        rules: 'Some game rules with at least 10 characters',
        maxPlayers: 4,
        minPlayers: 2,
      };
      const initialGame = createInitialGame(gameData, userId);

      expect(initialGame.title).toBe(gameData.name);
      expect(initialGame.creatorId).toBe(userId);
      expect(initialGame.players).toHaveLength(1);
      expect(initialGame.players[0]).toEqual({ _id: userId, ready: true, position: 1 });
    });
  });

  describe('createEndGamePayload', () => {
    it('should create an end game payload with a winner', () => {
      const winnerId = 'winner-1';
      const payload = createEndGamePayload(winnerId);

      expect(payload.status).toBe(GameStatus.ENDED);
      expect(payload.endedAt).toBeInstanceOf(Date);
      expect(payload.winnerId).toBe(winnerId);
    });

    it('should create an end game payload without a winner', () => {
      const payload = createEndGamePayload(null);

      expect(payload.status).toBe(GameStatus.ENDED);
      expect(payload.endedAt).toBeInstanceOf(Date);
      expect(payload.winnerId).toBeNull();
    });
  });

  describe('hasPlayerWon', () => {
    it('should return true if hand size is 0', () => {
      expect(hasPlayerWon(0)).toBe(true);
    });

    it('should return false if hand size is not 0', () => {
      expect(hasPlayerWon(1)).toBe(false);
      expect(hasPlayerWon(5)).toBe(false);
    });
  });

  describe('buildJoinGameSuccessResponse', () => {
    it('should build a success response for joining a game', () => {
      const response = buildJoinGameSuccessResponse(mockGame);

      expect(response.message).toBe('User joined the game successfully');
      expect(response.gameId).toBe(mockGame._id);
      expect(response.currentPlayerCount).toBe(mockGame.players.length);
    });
  });

  describe('buildSetPlayerReadySuccessResponse', () => {
    it('should build a success response for setting player ready', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 2 });
      const response = buildSetPlayerReadySuccessResponse(mockGame);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Player set to ready');
      expect(response.playersReadyCount).toBe(2);
      expect(response.totalPlayers).toBe(2);
    });
  });

  describe('buildAdvanceTurnSuccessResponse', () => {
    it('should build a success response with the next player ID', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 2 });
      mockGame.currentPlayerIndex = 1;
      const response = buildAdvanceTurnSuccessResponse(mockGame);

      expect(response).toBe('user-2');
    });
  });

  describe('getCurrentPlayer', () => {
    it('should return the current player if index is valid', () => {
      const result = getCurrentPlayer(mockGame);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockGame.players[0]);
    });

    it('should return a failure if current player index is invalid', () => {
      mockGame.currentPlayerIndex = 99; // Invalid index
      const result = getCurrentPlayer(mockGame);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(CouldNotDetermineCurrentPlayerError);
    });
  });

  describe('advanceTurn', () => {
    it('should advance the turn to the next player', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 2 });
      const updatedGame = advanceTurn(mockGame);

      expect(updatedGame.currentPlayerIndex).toBe(1);
    });

    it('should wrap around to the first player if at the end', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 2 });
      mockGame.currentPlayerIndex = 1; // Last player
      const updatedGame = advanceTurn(mockGame);

      expect(updatedGame.currentPlayerIndex).toBe(0);
    });

    it('should handle reverse turn direction', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 2 }, { _id: 'user-3', ready: true, position: 3 });
      mockGame.currentPlayerIndex = 1; // user-2
      mockGame.turnDirection = -1;
      const updatedGame = advanceTurn(mockGame);

      expect(updatedGame.currentPlayerIndex).toBe(0); // Should go to user-1
    });
  });

  describe('removePlayerFromGame', () => {
    it('should remove a player from the game and update positions', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 2 });
      const updatedGame = removePlayerFromGame(mockGame, userId);

      expect(updatedGame.players).toHaveLength(1);
      expect(updatedGame.players[0]._id).toBe('user-2');
      expect(updatedGame.players[0].position).toBe(1); // Position updated
    });

    it('should not modify players if user is not found', () => {
      const initialPlayerCount = mockGame.players.length;
      const updatedGame = removePlayerFromGame(mockGame, 'non-existent-user');
      expect(updatedGame.players).toHaveLength(initialPlayerCount);
    });
  });

  describe('determinePostAbandonmentAction', () => {
    it('should return END_GAME_WITH_WINNER if one player remains', () => {
      mockGame.players = [{ _id: 'user-2', ready: true, position: 1 }];
      const action = determinePostAbandonmentAction(mockGame);

      expect(action.action).toBe(PostAbandonmentAction.END_GAME_WITH_WINNER);
      expect(action.winnerId).toBe('user-2');
    });

    it('should return END_GAME_NO_WINNER if no players remain', () => {
      mockGame.players = [];
      const action = determinePostAbandonmentAction(mockGame);

      expect(action.action).toBe(PostAbandonmentAction.END_GAME_NO_WINNER);
      expect(action.winnerId).toBeNull();
    });

    it('should return SAVE_GAME if more than one player remains', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 2 });
      const action = determinePostAbandonmentAction(mockGame);

      expect(action.action).toBe(PostAbandonmentAction.SAVE_GAME);
      expect(action.winnerId).toBeUndefined();
    });
  });

  describe('abandonGame', () => {
    it('should remove player and determine post abandonment action (save game)', () => {
      mockGame.players.push({ _id: 'user-2', ready: true, position: 2 });
      const action = abandonGame(mockGame, userId);

      expect(mockGame.players).toHaveLength(1);
      expect(action.action).toBe(PostAbandonmentAction.SAVE_GAME);
    });

    it('should remove player and determine post abandonment action (end game with winner)', () => {
      mockGame.players = [{ _id: userId, ready: true, position: 1 }];
      const action = abandonGame(mockGame, userId); // userId abandons, 0 players remain

      expect(mockGame.players).toHaveLength(0);
      expect(action.action).toBe(PostAbandonmentAction.END_GAME_NO_WINNER);
    });
  });

  describe('buildAbandonGameSuccessResponse', () => {
    it('should return the correct success response', () => {
      const response = buildAbandonGameSuccessResponse();
      expect(response).toEqual({ success: true, message: 'You left the game' });
    });
  });

  describe('buildGetDiscardTopResponse', () => {
    it('should return top card details if discard pile is not empty', () => {
      const topCard = { cardId: 'c1', color: 'red', value: '1', type: 'number', playedBy: 'p1', playedAt: new Date(), order: 1 };
      mockGame.discardPile = [{ color: 'blue', value: '0', type: 'number' }, topCard];
      mockGame.initialCard = { color: 'green', value: 'wild', type: 'wild' };

      const response = buildGetDiscardTopResponse(mockGame);

      expect(response.game_id).toBe(gameId);
      expect(response.current_top_card.card_id).toBe('c1');
      expect(response.discard_pile_size).toBe(2);
      expect(response.recent_cards).toHaveLength(2);
    });

    it('should return null top_card if discard pile is empty', () => {
      mockGame.discardPile = [];
      mockGame.initialCard = null; // No initial card

      const response = buildGetDiscardTopResponse(mockGame);
      expect(response.game_id).toBe(gameId);
      expect(response.top_card).toBeNull();
      expect(response.discard_pile_size).toBe(0);
      expect(response.initial_card).toEqual({ color: 'blue', value: '0', type: 'number' }); // Default initial card
    });

    it('should use provided initial card if discard pile is empty and initial card is present', () => {
      mockGame.discardPile = [];
      mockGame.initialCard = { color: 'green', value: 'wild', type: 'wild' };

      const response = buildGetDiscardTopResponse(mockGame);
      expect(response.game_id).toBe(gameId);
      expect(response.top_card).toBeNull();
      expect(response.initial_card).toEqual(mockGame.initialCard);
    });
  });

  describe('buildDiscardTopSimpleResponse', () => {
    it('should build a simple response with the top card name', () => {
      const discardTopResponse = {
        game_id: gameId,
        current_top_card: { color: 'red', value: 'SKIP' },
        top_card: { color: 'red', value: 'SKIP' }, // This is ignored in the logic
      };
      const response = buildDiscardTopSimpleResponse(discardTopResponse);

      expect(response.game_ids).toEqual([gameId]);
      expect(response.top_cards).toEqual(['Red Skip']);
    });

    it('should build a simple response with an empty array if top_card is null', () => {
      const discardTopResponse = {
        game_id: gameId,
        top_card: null,
      };
      const response = buildDiscardTopSimpleResponse(discardTopResponse);

      expect(response.game_ids).toEqual([gameId]);
      expect(response.top_cards).toEqual([]);
    });
  });

  describe('buildGamePlayersResponse', () => {
    it('should build a response object with game info and player list', () => {
      const playersWithDetails = [
        { id: 'p1', username: 'Player1', ready: true, position: 1 },
      ];
      const response = buildGamePlayersResponse(mockGame, playersWithDetails);

      expect(response.gameId).toBe(gameId);
      expect(response.gameTitle).toBe(mockGame.title);
      expect(response.gameStatus).toBe(mockGame.status);
      expect(response.totalPlayers).toBe(playersWithDetails.length);
      expect(response.maxPlayers).toBe(mockGame.maxPlayers);
      expect(response.players).toEqual(playersWithDetails);
    });
  });

  describe('buildPlayerDetails', () => {
    it('should build player details with provided details', () => {
      const player = { _id: userId, ready: true, position: 1 };
      const playerDetails = { username: 'TestUser', email: 'test@example.com' };
      const details = buildPlayerDetails(player, playerDetails);

      expect(details.id).toBe(userId);
      expect(details.username).toBe('TestUser');
      expect(details.email).toBe('test@example.com');
      expect(details.ready).toBe(true);
      expect(details.position).toBe(1);
    });

    it('should build player details with default values if playerDetails is null', () => {
      const player = { _id: userId, ready: false, position: 1 };
      const details = buildPlayerDetails(player, null);

      expect(details.id).toBe(userId);
      expect(details.username).toBe('Unknown');
      expect(details.email).toBe('unknown@example.com');
      expect(details.ready).toBe(false);
      expect(details.position).toBe(1);
    });
  });

  describe('applyCardPlayEffects', () => {
    it('should remove the card from player hand and add to discard pile', () => {
      const cardToPlay = { _id: 'card-to-play', color: 'red', value: '1' };
      const currentPlayer = { hand: [cardToPlay, { _id: 'other-card' }] };
      mockGame.discardPile = [{ _id: 'discarded-card' }];

      applyCardPlayEffects(mockGame, currentPlayer, 0, cardToPlay);

      expect(currentPlayer.hand).toHaveLength(1);
      expect(currentPlayer.hand[0]._id).toBe('other-card');
      expect(mockGame.discardPile).toHaveLength(2);
      expect(mockGame.discardPile[1]).toEqual(cardToPlay);
    });
  });

  describe('checkWinConditionAndGetOutcome', () => {
    it('should return END_GAME_WITH_WINNER if player has no cards', () => {
      const currentPlayer = { _id: userId, hand: [] };
      const outcome = checkWinConditionAndGetOutcome(mockGame, currentPlayer);

      expect(outcome.action).toBe(PostPlayAction.END_GAME_WITH_WINNER);
      expect(outcome.winnerId).toBe(userId);
    });

    it('should return CONTINUE_GAME if player has cards', () => {
      const currentPlayer = { _id: userId, hand: [{ _id: 'card-1' }] };
      const outcome = checkWinConditionAndGetOutcome(mockGame, currentPlayer);

      expect(outcome.action).toBe(PostPlayAction.CONTINUE_GAME);
      expect(outcome.winnerId).toBeUndefined();
    });
  });

  describe('buildPlayCardSuccessMessage', () => {
    it('should return win message if action is END_GAME_WITH_WINNER', () => {
      const message = buildPlayCardSuccessMessage(PostPlayAction.END_GAME_WITH_WINNER);
      expect(message).toBe('You played your last card and won!');
    });

    it('should return generic success message if action is CONTINUE_GAME', () => {
      const message = buildPlayCardSuccessMessage(PostPlayAction.CONTINUE_GAME);
      expect(message).toBe('Card played successfully.');
    });
  });
});
