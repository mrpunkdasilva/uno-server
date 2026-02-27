/* eslint-disable jsdoc/require-description */
/* eslint-disable no-unused-vars */
import logger from '../../config/logger.js';
import ScoreRepository from '../../infra/repositories/score.repository.js';
import Result from '../utils/Result.js';

/**
 * Service to handle score business logic using Result Async Functor.
 */
class ScoreService {
  /**
   * @param scoreRepository instance initializes the ScoreService
   */
  constructor(scoreRepository) {
    this.scoreRepository = scoreRepository || new ScoreRepository();
  }

  /**
   * Calculates the point value of a single card.
   * @param {Object} card - The card object with type and value.
   * @returns {number} The point value of the card.
   */
  calculateCardPoints(card) {
    // Number cards (0-9): face value
    if (card.type === 'number') {
      return parseInt(card.value, 10);
    }

    // Action cards (Skip, Reverse, Draw Two): 20 points each
    if (card.type === 'action') {
      return 20;
    }

    // Wild cards (Wild, Wild Draw Four): 50 points each
    if (
      card.type === 'wild' ||
      card.value === 'wild' ||
      card.value === 'wild_draw_four'
    ) {
      return 50;
    }

    // Default fallback
    return 0;
  }

  /**
   * Calculates the total score of a hand of cards.
   * @param {Array} hand - Array of card objects.
   * @returns {number} The total score of the hand.
   */
  calculateHandScore(hand) {
    if (!hand || hand.length === 0) {
      return 0;
    }

    return hand.reduce(
      (total, card) => total + this.calculateCardPoints(card),
      0,
    );
  }

  /**
   * Calculates the final score for the winner based on opponents' hands.
   * @param {Object} game - The game object with players.
   * @param {string} winnerId - The ID of the winning player.
   * @returns {number} The final score for the winner.
   */
  calculateFinalScore(game, winnerId) {
    if (!game || !game.players || !winnerId) {
      return 0;
    }

    let totalScore = 0;

    // Sum up points from all opponents' hands
    for (const player of game.players) {
      // Skip the winner (they should have 0 cards)
      if (player._id.toString() === winnerId.toString()) {
        continue;
      }

      // Calculate points for this player's hand
      const handScore = this.calculateHandScore(player.hand || []);
      totalScore += handScore;
    }

    return totalScore;
  }

  /**
   * Calculates the final score and creates a score entry for the winner.
   * @param {Object} game - The game object with players.
   * @param {string} winnerId - The ID of the winning player.
   * @param {string} matchId - The ID of the match/game.
   * @returns {Promise<Result>} Result with created score or error.
   */
  async calculateAndCreateScore(game, winnerId, matchId) {
    return Result.success({ game, winnerId, matchId })
      .toAsync()
      .tap(({ winnerId: wId }) =>
        logger.info(
          `Calculating final score for winner ${wId} in game ${matchId}.`,
        ),
      )
      .map(({ game: g, winnerId: wId, matchId: mId }) => {
        const finalScore = this.calculateFinalScore(g, wId);

        logger.info(
          `Winner ${wId} scored ${finalScore} points in game ${mId}.`,
        );

        return {
          playerId: wId,
          matchId: mId,
          score: finalScore,
        };
      })
      .chain(async (scoreData) => {
        const score = await this.scoreRepository.create(scoreData);

        if (!score) {
          throw new Error('Failed to create score - repository returned null');
        }

        return Result.success(score);
      })
      .tap((score) =>
        logger.info(
          `Score saved successfully for player ${winnerId} in game ${matchId}.`,
        ),
      )
      .tapError((error) =>
        logger.error(
          `Failed to calculate/save score for player ${winnerId}: ${error.message}`,
        ),
      )
      .toResult();
  }

  /**
   * Creates a new score entry in the database.
   * @param {Object} scoreData - The data to create the score.
   * @returns {Promise<Result>} Result with created score or error.
   */
  async createScore(scoreData) {
    const playerId = scoreData.playerId;

    return Result.success(scoreData)
      .toAsync()
      .tap(() =>
        logger.info(
          `Attempting to create a new score entry for player ${playerId}.`,
        ),
      )
      .chain(async (data) => {
        const score = await this.scoreRepository.create(data);

        if (!score) {
          throw new Error('Failed to create score - repository returned null');
        }

        return Result.success(score);
      })
      .tap((score) =>
        logger.info(
          `Score created successfully for player ${playerId} with ID ${score._id}.`,
        ),
      )
      .tapError((error) =>
        logger.error(
          `Failed to create score for player ${playerId}: ${error.message}`,
        ),
      )
      .toResult();
  }

  /**
   * Retrieves all scores from the database, populated with player info.
   * @returns {Promise<Result>} Result with scores list or error.
   */
  async getAllScores() {
    return Result.success()
      .toAsync()
      .tap(() => logger.info('Attempting to retrieve all scores.'))
      .chain(async () => {
        const scores = await this.scoreRepository.findAll();
        return Result.success(scores);
      })
      .tap((scores) =>
        logger.info(`Successfully retrieved ${scores.length} scores.`),
      )
      .tapError((error) =>
        logger.error(`Failed to retrieve all scores: ${error.message}`),
      )
      .toResult();
  }

  /**
   * Retrieves a specific score by ID.
   * @param {string} id - The ID of the score to retrieve.
   * @returns {Promise<Result>} Result with score or error.
   */
  async getScoreById(id) {
    const scoreId = id;

    return Result.success(scoreId)
      .toAsync()
      .tap(() =>
        logger.info(`Attempting to retrieve score with ID: ${scoreId}`),
      )
      .chain(async (idToFind) => {
        const score = await this.scoreRepository.findById(idToFind);

        if (!score) {
          throw new Error('Score not found');
        }

        return Result.success(score);
      })
      .tap((score) =>
        logger.info(`Score with ID ${scoreId} retrieved successfully.`),
      )
      .tapError((error) => {
        const logMessage =
          error.message === 'Score not found'
            ? `Score with ID ${scoreId} not found.`
            : `Failed to retrieve score with ID ${scoreId}: ${error.message}`;

        if (error.message === 'Score not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }

  /**
   * Updates a score entry in the database.
   * @param {string} id - The ID of the score to update.
   * @param {Object} scoreData - The data to update the score.
   * @returns {Promise<Result>} Result with updated score or error.
   */
  async updateScore(id, scoreData) {
    const scoreId = id;

    return Result.success({ id: scoreId, data: scoreData })
      .toAsync()
      .tap(() => logger.info(`Attempting to update score with ID: ${scoreId}`))
      .chain(async ({ id: idToUpdate, data }) => {
        const updatedScore = await this.scoreRepository.update(
          idToUpdate,
          data,
        );

        if (!updatedScore) {
          throw new Error('Score not found');
        }

        return Result.success(updatedScore);
      })
      .tap((score) =>
        logger.info(`Score with ID ${scoreId} updated successfully.`),
      )
      .tapError((error) => {
        const logMessage =
          error.message === 'Score not found'
            ? `Score with ID ${scoreId} not found for update.`
            : `Failed to update score with ID ${scoreId}: ${error.message}`;

        if (error.message === 'Score not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }

  /**
   * Deletes a score entry from the database.
   * @param {string} id - The ID of the score to delete.
   * @returns {Promise<Result>} Result with deleted score or error.
   */
  async deleteScore(id) {
    const scoreId = id;

    return Result.success(scoreId)
      .toAsync()
      .tap(() => logger.info(`Attempting to delete score with ID: ${scoreId}`))
      .chain(async (idToDelete) => {
        const deletedScore = await this.scoreRepository.delete(idToDelete);

        if (!deletedScore) {
          throw new Error('Score not found');
        }

        return Result.success(deletedScore);
      })
      .tap((deletedScore) =>
        logger.info(`Score with ID ${scoreId} deleted successfully.`),
      )
      .tapError((error) => {
        const logMessage =
          error.message === 'Score not found'
            ? `Score with ID ${scoreId} not found for deletion.`
            : `Failed to delete score with ID ${scoreId}: ${error.message}`;

        if (error.message === 'Score not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }
  /**
   * Retrieves scores for a specific match/game.
   * @param {string} matchId - The ID of the match.
   * @returns {Promise<Result>} Result with list of scores for the match.
   */
  async getScoresByMatchId(matchId) {
    return Result.success(matchId)
      .toAsync()
      .tap(() =>
        logger.info(`Attempting to retrieve scores for match: ${matchId}`),
      )
      .chain(async (id) => {
        // Chama o método específico do repositório que filtra pelo ID
        const scores = await this.scoreRepository.findByMatchId(id);
        return Result.success(scores);
      })
      .tap((scores) =>
        logger.info(
          `Successfully retrieved ${scores.length} scores for match ${matchId}.`,
        ),
      )
      .tapError((error) =>
        logger.error(
          `Failed to retrieve scores for match ${matchId}: ${error.message}`,
        ),
      )
      .toResult();
  }

  /**
   * Retrieves and formats scores for a specific match/game.
   * @param {string} matchId - The ID of the match.
   * @returns {Promise<Result>} Result with dictionary of scores (username: score).
   */
  async getMatchScores(matchId) {
    return Result.success(matchId)
      .toAsync()
      .tap(() =>
        logger.info(
          `Attempting to retrieve and format scores for match: ${matchId}`,
        ),
      )
      .chain(async (id) => {
        const scores = await this.scoreRepository.findByMatchId(id);

        const formattedScores = scores.reduce((acc, current) => {
          const username = current.playerId?.username || 'Unknown';
          acc[username] = (acc[username] || 0) + current.score;
          return acc;
        }, {});

        return Result.success({ scores: formattedScores });
      })
      .tap((formatted) =>
        logger.info(
          `Successfully formatted scores for match ${matchId}: ${JSON.stringify(
            formatted.scores,
          )}`,
        ),
      )
      .tapError((error) =>
        logger.error(
          `Failed to get match scores for match ${matchId}: ${error.message}`,
        ),
      )
      .toResult();
  }
}

export default ScoreService;
