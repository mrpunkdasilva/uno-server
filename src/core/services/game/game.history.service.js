import logger from '../../../config/logger.js';
import { colorMap, valueMap } from '../../enums/card.enum.js';

/**
 *
 */
class GameHistoryService {
  /**
   * Creates a new instance of the history service.
   * @constructor
   * @param {GameRepository} gameRepository - Repository for game operations
   * @param {PlayerRepository} playerRepository - Repository for retrieving player information
   */
  constructor(gameRepository, playerRepository) {
    this.gameRepository = gameRepository;
    this.playerRepository = playerRepository;
  }

  /**
   * Adds a new entry to the game history.
   * This is the base method used by all other specific methods.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - ID of the player who performed the action
   * @param {string} actionType - Action type (PLAY_CARD, DRAW_CARD, etc.)
   * @param {string} actionDescription - Readable description of the action
   * @param {Object} [additionalData={}] - Additional data specific to the action
   * @param {Object} [additionalData.cardPlayed] - Information about the card played
   * @param {string} [additionalData.chosenColor] - Color chosen for Wild cards
   * @returns {Promise<void>}
   * @throws {Error} If there is an error when searching for a game or player
   */
  async addAction(
    gameId,
    playerId,
    actionType,
    actionDescription,
    additionalData = {},
  ) {
    try {
      // Search for player name
      let playerName = 'Unknown';
      try {
        const player = await this.playerRepository.findById(playerId);
        playerName = player?.username || 'Unknown';
      } catch (error) {
        logger.warn(`Could not fetch player name: ${error.message}`);
      }

      // Search for the current game
      const game = await this.gameRepository.findById(gameId);
      if (!game) {
        logger.warn(`Game ${gameId} not found for history entry`);
        return;
      }

      // Create history entry
      const historyEntry = {
        playerId,
        playerName,
        action: actionDescription,
        actionType,
        timestamp: new Date(),
        ...additionalData,
      };

      // Add to the game history array
      if (!game.history) {
        game.history = [];
      }

      game.history.push(historyEntry);

      // Save only the history field (more efficient)
      await this.gameRepository.update(gameId, {
        history: game.history,
      });

      logger.info(`History added to game ${gameId}: ${actionDescription}`);
    } catch (error) {
      logger.error(`Failed to add history: ${error.message}`);
    }
  }

  /**
   * Retrieves the action history for a specific game.
   * Returns entries sorted from newest to oldest.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {number} [limit=50] - Maximum number of entries to return
   * @returns {Promise<Object>} Object containing the game history
   * @returns {string} return.gameId - ID of the game queried
   * @returns {Array} return.history - List of history entries
   * @returns {number} return.total - Total number of entries in the history
   * @throws {Error} If the game is not found
   */
  async getGameHistory(gameId, limit = 50) {
    const game = await this.gameRepository.findById(gameId);

    if (!game || !game.history) {
      return {
        gameId,
        history: [],
      };
    }

    // Return the last ‘limit’ records, sorted from newest to oldest
    const history = [...game.history]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map((entry) => ({
        player: entry.playerName,
        action: entry.action,
        timestamp: entry.timestamp,
        actionType: entry.actionType,
        ...(entry.cardPlayed && { card: entry.cardPlayed }),
        ...(entry.chosenColor && { chosenColor: entry.chosenColor }),
      }));

    return {
      gameId,
      history,
      total: game.history.length,
    };
  }

  /**
   * Formats a card for display in the history.
   * Uses the color and value mappings defined in the enums.
   *
   * @private
   * @param {Object} card - Card object
   * @param {string} card.color - Card color
   * @param {string} card.value - Card value
   * @returns {Object|null} Object formatted for display or null if card is invalid
   */
  _getCardDisplay(card) {
    if (!card) return null;

    return {
      color: card.color,
      value: valueMap[card.value] || card.value,
    };
  }

  /**
   * Records the action of playing a card.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @param {Object} card - Object of the card played
   * @returns {Promise<void>}
   */
  async recordCardPlay(gameId, playerId, card) {
    const cardDisplay = this._getCardDisplay(card);
    const action = `Played ${colorMap[card.color] || card.color} ${
      cardDisplay.value
    }`;

    await this.addAction(gameId, playerId, 'PLAY_CARD', action, {
      cardPlayed: cardDisplay,
    });
  }

  /**
   * Records the action of buying a card.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @returns {Promise<void>}
   */
  async recordDrawCard(gameId, playerId) {
    await this.addAction(gameId, playerId, 'DRAW_CARD', 'Drew a card');
  }

  /**
   * Records the action of skipping a turn (Skip card).
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @returns {Promise<void>}
   */
  async recordSkipTurn(gameId, playerId) {
    await this.addAction(gameId, playerId, 'SKIP_TURN', 'Skipped turn');
  }

  /**
   * Records the action of reversing the direction of the game (Reverse card).
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @returns {Promise<void>}
   */
  async recordReverse(gameId, playerId) {
    await this.addAction(gameId, playerId, 'REVERSE', 'Reversed direction');
  }

  /**
   * Records the action of changing the current color of the game (Wild card).
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @param {string} chosenColor - Color chosen by the player
   * @returns {Promise<void>}
   */
  async recordWildColorChange(gameId, playerId, chosenColor) {
    const color = colorMap[chosenColor] || chosenColor;
    await this.addAction(
      gameId,
      playerId,
      'WILD_COLOR_CHANGE',
      `Changed color to ${color}`,
      { chosenColor },
    );
  }

  /**
   * Registers the start of the game.
   * Usually called by the match creator.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - ID of the player who started the game
   * @returns {Promise<void>}
   */
  async recordGameStart(gameId, playerId) {
    await this.addAction(gameId, playerId, 'START_GAME', 'Started the game');
  }

  /**
   * Records the end of the game with a winner.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - ID of the winning player
   * @returns {Promise<void>}
   */
  async recordGameEnd(gameId, playerId) {
    await this.addAction(gameId, playerId, 'END_GAME', 'Won the game!');
  }

  /**
   * Registers a player's entry into the match.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - ID of the player who entered
   * @returns {Promise<void>}
   */
  async recordPlayerJoin(gameId, playerId) {
    await this.addAction(gameId, playerId, 'JOIN_GAME', 'Joined the game');
  }

  /**
   * Records a player leaving the game.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - ID of the player who left
   * @returns {Promise<void>}
   */
  async recordPlayerLeave(gameId, playerId) {
    await this.addAction(gameId, playerId, 'LEAVE_GAME', 'Left the game');
  }

  /**
   * Records when a player declares themselves ready to start.
   *
   * @async
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @returns {Promise<void>}
   */
  async recordPlayerReady(gameId, playerId) {
    await this.addAction(gameId, playerId, 'READY', 'Is ready to start');
  }
}

export default GameHistoryService;
