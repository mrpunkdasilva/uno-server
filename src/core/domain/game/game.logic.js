import {
  GameStatus,
  PostAbandonmentAction,
  PostPlayAction,
} from '../../enums/game.enum.js';
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
 * Starts the game by updating its status, player positions
 * and dealing initial cards.
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

  // Initialize deck if it doesn't exist or is empty
  if (!game.deck || game.deck.length === 0) {
    game.deck = createStandardDeck();
  }

  // Deal 7 cards to each player
  dealCardsSimple(game, 7);

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
export const buildJoinGameSuccessResponse = (game) => {
  const gameId = game._id.toString();

  const response = {
    message: 'User joined the game successfully',
    gameId: gameId,
    currentPlayerCount: game.players.length,
  };

  return response;
};

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

/**
 * Applies the effects of playing a card to the game state.
 * Mutates the game object by removing the card from the player's hand and adding it to the discard pile.
 * @param {object} game - The game object.
 * @param {object} currentPlayer - The player who played the card.
 * @param {number} cardIndex - The index of the card in the player's hand.
 * @param {object} cardToPlay - The card being played.
 * @returns {object} The mutated game object.
 */
export const applyCardPlayEffects = (
  game,
  currentPlayer,
  cardIndex,
  cardToPlay,
) => {
  currentPlayer.hand.splice(cardIndex, 1);
  game.discardPile.push(cardToPlay);
  return game;
};

/**
 * Checks if the current player has won the game after playing a card and determines the post-play action.
 * @param {object} game - The game object.
 * @param {object} currentPlayer - The current player object.
 * @returns {{action: string, winnerId?: string | null}} - An object indicating the action to take (e.g., 'END_GAME_WITH_WINNER' or 'CONTINUE_GAME').
 */
export const checkWinConditionAndGetOutcome = (game, currentPlayer) => {
  if (hasPlayerWon(currentPlayer.hand.length)) {
    return {
      action: PostPlayAction.END_GAME_WITH_WINNER,
      winnerId: currentPlayer._id.toString(),
    };
  }
  return { action: PostPlayAction.CONTINUE_GAME };
};

/**
 * Builds the success message for a card play operation.
 * @param {string} action - The post-play action taken (from PostPlayAction enum).
 * @returns {string} The appropriate success message.
 */
export const buildPlayCardSuccessMessage = (action) => {
  return action === PostPlayAction.END_GAME_WITH_WINNER
    ? 'You played your last card and won!'
    : 'Card played successfully.';
};

/**
 * Creates a standard UNO deck with all cards.
 * @returns {Array} Array of card objects representing a complete UNO deck.
 */
export const createStandardDeck = () => {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const deck = [];
  let cardId = 1;

  // Number cards: 0 (one per color), 1-9 (two per color)
  colors.forEach((color) => {
    // One 0 card per color
    deck.push({
      cardId: `card-${cardId++}`,
      color: color,
      value: '0',
      type: 'number',
    });

    // Two of each 1-9 per color
    for (let num = 1; num <= 9; num++) {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          cardId: `card-${cardId++}`,
          color: color,
          value: String(num),
          type: 'number',
        });
      }
    }
  });

  // Action cards: Skip, Reverse, Draw Two (two per color)
  const actions = ['skip', 'reverse', 'draw_two'];
  colors.forEach((color) => {
    actions.forEach((action) => {
      for (let copy = 0; copy < 2; copy++) {
        deck.push({
          cardId: `card-${cardId++}`,
          color: color,
          value: action,
          type: 'action',
        });
      }
    });
  });

  // Wild cards: 4 Wild, 4 Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push({
      cardId: `card-${cardId++}`,
      color: 'wild',
      value: 'wild',
      type: 'wild',
    });
  }

  for (let i = 0; i < 4; i++) {
    deck.push({
      cardId: `card-${cardId++}`,
      color: 'wild',
      value: 'wild_draw_four',
      type: 'wild',
    });
  }

  // Shuffle the deck using Fisher-Yates algorithm
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

/**
 * Distributes cards equally to players.
 * Mutates the game object.
 * @param {object} game - The game object (must contain deck and players).
 * @param {number} cardsPerPlayer - Number of cards per player.
 * @returns {object} The mutated game object.
 */
export const dealCardsSimple = (game, cardsPerPlayer) => {
  if (!game.deck || game.deck.length === 0) return game;

  for (let i = 0; i < cardsPerPlayer; i++) {
    game.players.forEach((player) => {
      if (!player.hand) {
        player.hand = [];
      }

      if (game.deck.length > 0) {
        player.hand.push(game.deck.shift());
      }
    });
  }

  return game;
};

/**
 * Validates if a card can be played according to the top discard card.
 * @param {object|null} topCard - The card on top of the discard pile.
 * @param {object} cardToPlay - The card the player wants to play.
 * @param {string|null} currentColor - The current active color (set by Wild cards).
 * @returns {boolean} True if valid, false otherwise.
 */
export const isValidCardPlay = (topCard, cardToPlay, currentColor = null) => {
  if (!topCard) return true;

  // Wild cards can always be played
  if (
    cardToPlay.value?.toLowerCase() === 'wild' ||
    cardToPlay.value?.toLowerCase() === 'wild_draw_four' ||
    cardToPlay.type?.toLowerCase() === 'wild'
  ) {
    return true;
  }

  // If a Wild card was played previously, currentColor takes precedence
  if (currentColor && topCard.type?.toLowerCase() === 'wild') {
    return (
      cardToPlay.color === currentColor || cardToPlay.value === topCard.value
    );
  }

  // Standard UNO rule: match color OR value
  return (
    cardToPlay.color === topCard.color || cardToPlay.value === topCard.value
  );
};

/**
 * Formats a card object into a readable string
 * @param {Object} card - The card object
 * @returns {string} Formatted card string (e.g., "Red 3", "Blue Skip")
 */
export const formatCardForDisplay = (card) => {
  if (!card) return 'Unknown Card';

  const color = colorMap[card.color] || card.color;
  const value = valueMap[card.value] || card.value;

  return `${color} ${value}`;
};

/**
 * Builds the response for getting a player's hand
 * @param {string} playerId - The ID of the player
 * @param {Array} hand - The player's hand of cards
 * @returns {Object} Formatted hand response
 */
export const buildPlayerHandResponse = (playerId, hand) => ({
  player: playerId,
  hand: hand.map((card) => formatCardForDisplay(card)),
});

/**
 * Validates if the player exists in the game and returns their hand
 * @param {Object} gameData - The game data containing player hand
 * @param {string} playerId - The ID of the player
 * @returns {Result<Object, Error>} Result containing hand data or error
 */
export const extractPlayerHand = (gameData, playerId) => {
  if (!gameData || !gameData.hand) {
    return Result.failure(new Error('No hand data available'));
  }

  return Result.success({
    playerId: playerId,
    hand: gameData.hand,
  });
};

/**
 * Checks if a player has any card that can be played on top of the given card.
 * @param {object|null} topCard - The card on top of the discard pile.
 * @param {Array<object>} hand - The player's hand of cards.
 * @returns {boolean} True if the player has at least one playable card, false otherwise.
 */
export const hasPlayableCards = (topCard, hand) => {
  if (!hand || hand.length === 0) return false;
  return hand.some((card) => isValidCardPlay(topCard, card));
};

/**
 * Draws a card from the deck and adds it to the player's hand.
 * Mutates the game object.
 * @param {object} game - The game object.
 * @param {string} playerId - The ID of the player drawing the card.
 * @returns {object|null} The drawn card or null if deck is empty.
 */
export const drawCard = (game, playerId) => {
  if (!game.deck || game.deck.length === 0) return null;

  const card = game.deck.shift();
  const player = game.players.find((p) => p._id.toString() === playerId);

  if (player) {
    if (!player.hand) {
      player.hand = [];
    }
    player.hand.push(card);
  }

  return card;
};

/**
 * Builds the success response for drawing a card.
 * @param {string} playerId - The ID of the player who drew the card.
 * @param {object} card - The card that was drawn.
 * @returns {object} The success response object.
 */
export const buildDrawCardSuccessResponse = (playerId, card) => ({
  message: `${playerId} drew a card from the deck.`,
  cardDrawn: formatCardForDisplay(card),
});

/**
 * Calculates the score of a single card.
 * @param {object} card - The card object.
 * @returns {number} The point value of the card.
 */
export const calculateCardScore = (card) => {
  if (card.type === 'wild') return 50;
  if (card.type === 'action') return 20;
  if (card.type === 'number') return parseInt(card.value, 10) || 0;
  return 0;
};

/**
 * Calculates the total score of a hand of cards.
 * @param {Array<object>} hand - The hand of cards.
 * @returns {number} The total score.
 */
export const calculateHandScore = (hand) => {
  if (!hand || !Array.isArray(hand)) return 0;
  return hand.reduce((total, card) => total + calculateCardScore(card), 0);
};

/**
 * Calculates the current scores for all players in a game.
 * @param {object} game - The game object.
 * @returns {object} An object with player usernames as keys and their current scores as values.
 */
export const calculateAllPlayerScores = (game) => {
  const scores = {};
  game.players.forEach((player) => {
    // Note: player._id might be populated with player object containing username
    // but in game object in game.repository it might just be the ID.
    // However, if we populate it, we can get the username.
    const username =
      player._id.username || player.username || player._id.toString();
    scores[username] = calculateHandScore(player.hand);
  });
  return scores;
};
