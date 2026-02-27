/**
 * Calculates the next player index after a skip card is played
 * @param {number} currentPlayerIndex - The current player's index
 * @param {Array} players - Array of players
 * @param {string} direction - Current game direction ('clockwise' or 'counter-clockwise')
 * @returns {Object} Information about the skipped player and next player
 */
export const calculateSkipResult = (currentPlayerIndex, players, direction) => {
  const totalPlayers = players.length;

  // Calculate skipped player (the one whose turn is being skipped)
  let skippedPlayerIndex;
  if (direction === 'clockwise') {
    skippedPlayerIndex = (currentPlayerIndex + 1) % totalPlayers;
  } else {
    skippedPlayerIndex = (currentPlayerIndex - 1 + totalPlayers) % totalPlayers;
  }

  // Calculate next player after the skip
  let nextPlayerIndex;
  if (direction === 'clockwise') {
    nextPlayerIndex = (skippedPlayerIndex + 1) % totalPlayers;
  } else {
    nextPlayerIndex = (skippedPlayerIndex - 1 + totalPlayers) % totalPlayers;
  }

  return {
    nextPlayerIndex,
    nextPlayer:
      players[nextPlayerIndex].username || players[nextPlayerIndex].id,
    skippedPlayer:
      players[skippedPlayerIndex].username || players[skippedPlayerIndex].id,
    skippedPlayerIndex,
  };
};

/**
 * Builds the response object for a skip card play
 * @param {Object} skipResult - Result from calculateSkipResult
 * @returns {Object} Formatted response object
 */
export const buildSkipResponse = (skipResult) => {
  return {
    status: 200,
    body: {
      nextPlayerIndex: skipResult.nextPlayerIndex,
      nextPlayer: skipResult.nextPlayer,
      skippedPlayer: skipResult.skippedPlayer,
    },
  };
};
