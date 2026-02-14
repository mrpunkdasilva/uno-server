import { GameStatus, PostAbandonmentAction } from '../../enums/game.enum.js';
import { CouldNotDetermineCurrentPlayerError } from '../../errors/game.errors.js';
import { Result } from '../../utils/Result.js';
import { colorMap, valueMap } from '../../enums/card.enum.js';

/**
 * Adds a player to the game.
 * @param {object} game The game object.
 * @param {string} userId The user ID of the player to add.
 * @returns {object} The mutated game object.
 */
export const addPlayer = (game, userId) => {
  game.players.push({ _id: userId, ready: false, position: 0 });
  return game;
};

/**
 * Marks a player in the game as ready.
 * Assumes the player exists in the game.
 * @param {object} game The game object.
 * @param {string} userId The user ID of the player to mark as ready.
 * @returns {object} The mutated game object.
 */
export const markPlayerAsReady = (game, userId) => {
  const playerEntry = game.players.find((p) => p._id.toString() === userId);
  if (playerEntry) {
    playerEntry.ready = true;
  }
  return game;
};

/**
 * Starts the game by updating its status and player positions.
 * @param {object} game The game object.
 * @returns {object} The mutated game object.
 */
export const startGame = (game) => {
  game.status = GameStatus.ACTIVE;
  game.currentPlayerIndex = 0;
  game.turnDirection = 1;
  game.players.forEach((player, index) => {
    player.position = index + 1;
  });
  return game;
};

/**
 * Creates the initial data structure for a new game.
 * @param {object} gameData - The validated data from the create DTO.
 * @param {string} userId - The ID of the user creating the game.
 * @returns {object} The initial game data object for the repository.
 */
export const createInitialGame = (gameData, userId) => {
  const { name, rules, maxPlayers, minPlayers } = gameData;
  return {
    title: name,
    rules: rules,
    maxPlayers: maxPlayers,
    minPlayers: minPlayers,
    creatorId: userId,
    players: [{ _id: userId, ready: true, position: 1 }],
  };
};

/**
 * Creates the payload for ending a game.
 * @param {string|null} winnerId - The ID of the winning player, if any.
 * @returns {object} The update payload for the repository.
 */
export const createEndGamePayload = (winnerId = null) => ({
  status: GameStatus.ENDED,
  endedAt: new Date(),
  winnerId: winnerId,
});

/**
 * Checks if a player has met the win condition (e.g., empty hand).
 * @param {number} handSize - The size of the player's hand.
 * @returns {boolean} True if the player has won, false otherwise.
 */
export const hasPlayerWon = (handSize) => handSize === 0;

/**
 * Builds the success response object for a player joining a game.
 * @param {object} game - The game object after the player has joined.
 * @returns {object} The success response object.
 */
export const buildJoinGameSuccessResponse = (game) => ({
  message: 'User joined the game successfully',
  gameId: game._id,
  currentPlayerCount: game.players.length,
});

/**
 * Builds the success response object for a player setting ready.
 * @param {object} game - The game object after the player has set ready.
 * @returns {object} The success response object.
 */
export const buildSetPlayerReadySuccessResponse = (game) => ({
  success: true,
  message: 'Player set to ready',
  playersReadyCount: game.players.filter((p) => p.ready).length,
  totalPlayers: game.players.length,
});

/**
 * Builds the success response for the advanceTurn operation.
 * @param {object} game - The game object after the turn has advanced.
 * @returns {string} The ID of the new current player.
 */
export const buildAdvanceTurnSuccessResponse = (game) => {
  const newCurrentPlayer = game.players[game.currentPlayerIndex];
  return newCurrentPlayer._id.toString();
};

/**
 * Gets the current player from the game object.
 * @param {object} game - The game object.
 * @returns {Result<object, CouldNotDetermineCurrentPlayerError>} A Result containing the current player object or an error.
 */
export const getCurrentPlayer = (game) => {
  const currentPlayer = game.players[game.currentPlayerIndex];
  return currentPlayer
    ? Result.success(currentPlayer)
    : Result.failure(new CouldNotDetermineCurrentPlayerError());
};

/**
 * Advances the turn to the next player.
 * Mutates the game object by updating the currentPlayerIndex.
 * @param {object} game - The game object.
 * @returns {object} The mutated game object.
 */
export const advanceTurn = (game) => {
  const numPlayers = game.players.length;
  game.currentPlayerIndex =
    (game.currentPlayerIndex + game.turnDirection + numPlayers) % numPlayers;
  return game;
};

/**
 * Handles the logic for a player abandoning a game. It removes the player
 * from the game and determines the subsequent action to be taken.
 * Note: This function mutates the provided game object.
 * @param {object} game - The game object.
 * @param {string} userId - The ID of the player abandoning the game.
 * @returns {{action: string, winnerId?: string | null}} - The action to take next.
 */
export const abandonGame = (game, userId) => {
  removePlayerFromGame(game, userId);
  return determinePostAbandonmentAction(game);
};

/**
 * Removes a player from the game and updates player positions.
 * Mutates the game object.
 * @param {object} game - The game object.
 * @param {string} userId - The ID of the player to remove.
 * @returns {object} The mutated game object.
 */
export const removePlayerFromGame = (game, userId) => {
  game.players = game.players.filter((p) => p._id.toString() !== userId);
  game.players.forEach((p, index) => {
    p.position = index + 1;
  });
  return game;
};

/**
 * Determines the outcome of a game after a player abandons.
 * @param {object} game - The game object after a player has abandoned.
 * @returns {{action: string, winnerId?: string | null}} - An object indicating the action to take.
 */
export const determinePostAbandonmentAction = (game) => {
  const remainingPlayers = game.players.length;
  if (remainingPlayers === 1) {
    return {
      action: PostAbandonmentAction.END_GAME_WITH_WINNER,
      winnerId: game.players[0]._id.toString(),
    };
  } else if (remainingPlayers === 0) {
    return {
      action: PostAbandonmentAction.END_GAME_NO_WINNER,
      winnerId: null,
    };
  } else {
    return { action: PostAbandonmentAction.SAVE_GAME };
  }
};

/**
 * Builds the success response for the abandonGame operation.
 * @returns {object} The success response object.
 */
export const buildAbandonGameSuccessResponse = () => ({
  success: true,
  message: 'You left the game',
});

/**
 * Builds the success response for the getDiscardTop operation.
 * @param {object} game - The game object, which includes the discard pile.
 * @returns {object} The success response object.
 */
export const buildGetDiscardTopResponse = (game) => {
  if (!game.discardPile || game.discardPile.length === 0) {
    return {
      game_id: game._id.toString(),
      top_card: null,
      message: 'Discard pile is empty - no cards have been played yet',
      discard_pile_size: 0,
      initial_card: game.initialCard || {
        color: 'blue',
        value: '0',
        type: 'number',
      },
    };
  }

  const topCard = game.discardPile[game.discardPile.length - 1];
  const recentCards = game.discardPile.slice(-5).reverse();

  return {
    game_id: game._id.toString(),
    current_top_card: {
      card_id: topCard.cardId,
      color: topCard.color,
      value: topCard.value,
      type: topCard.type,
      played_by: topCard.playedBy?.toString() || 'system',
      played_at: topCard.playedAt,
      order: topCard.order,
    },
    recent_cards: recentCards.map((card) => ({
      color: card.color,
      value: card.value,
      type: card.type,
      played_by: card.playedBy?.toString() || 'system',
      order: card.order,
    })),
    discard_pile_size: game.discardPile.length,
  };
};

/**
 * Builds the simple success response for the getDiscardTopSimple operation (legacy).
 * @param {object} discardTopResponse - The rich response object from the getDiscardTop operation.
 * @returns {object} The simplified legacy response object.
 */
export const buildDiscardTopSimpleResponse = (discardTopResponse) => {
  if (discardTopResponse.top_card === null) {
    return {
      game_ids: [discardTopResponse.game_id],
      top_cards: [],
    };
  }

  const card = discardTopResponse.current_top_card;
  const color = colorMap[card.color] || card.color;
  const value = valueMap[card.value] || card.value;
  const cardName = `${color} ${value}`;

  return {
    game_ids: [discardTopResponse.game_id],
    top_cards: [cardName],
  };
};

/**
 * Builds the response object for the getGamePlayers operation.
 * @param {object} game - The game object.
 * @param {Array<object>} playersWithDetails - An array of player objects with enriched details.
 * @returns {object} The response object containing game info and player list.
 */
export const buildGamePlayersResponse = (game, playersWithDetails) => ({
  gameId: game._id.toString(),
  gameTitle: game.title,
  gameStatus: game.status,
  totalPlayers: playersWithDetails.length,
  maxPlayers: game.maxPlayers,
  players: playersWithDetails,
});

/**
 * Builds the detailed player object for responses.
 * @param {object} player - The player object from the game's player list.
 * @param {object|null} playerDetails - The detailed player object from the player repository, or null if not found.
 * @returns {object} The enriched player object.
 */
export const buildPlayerDetails = (player, playerDetails) => ({
  id: player._id.toString(),
  username: playerDetails?.username || 'Unknown',
  email: playerDetails?.email || 'unknown@example.com',
  ready: player.ready,
  position: player.position,
});
