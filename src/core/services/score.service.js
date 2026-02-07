/* eslint-disable no-unused-vars */
import logger from '../../config/logger.js';
import ScoreRepository from '../../infra/repositories/score.repository.js';
import Result from '../../utils/Result.js';

/**
 * Service to handle score business logic using Result Functor.
 */
class ScoreService {
  /**
   * Initializes the ScoreService with a ScoreRepository instance.
   */
  constructor() {
    this.scoreRepository = new ScoreRepository();
  }

  /**
   * Creates a new score entry in the database.
   * @param {Object} scoreData - The data to create the score.
   * @returns {Promise<Result>} Result with created score or error.
   */
  async createScore(scoreData) {
    const playerId = scoreData.playerId;

    return Result.success(scoreData)
      .tap(() =>
        logger.info(
          `Attempting to create a new score entry for player ${playerId}.`,
        ),
      )
      .chainAsync(async (data) => {
        const score = await this.scoreRepository.create(data);
        if (!score) {
          throw new Error('Failed to create score - repository returned null');
        }
        return Result.success(score);
      })
      .tap((createdScore) =>
        logger.info(
          `Score created successfully for player ${playerId} with ID ${createdScore._id}.`,
        ),
      )
      .catch((error) => {
        logger.error(
          `Failed to create score for player ${playerId}: ${error.message}`,
        );
        return Result.failure(error);
      });
  }

  /**
   * Retrieves all scores from the database, populated with player info.
   * @returns {Promise<Result>} Result with scores list or error.
   */
  async getAllScores() {
    return Result.success()
      .tap(() => logger.info('Attempting to retrieve all scores.'))
      .chainAsync(async () => {
        const scores = await this.scoreRepository.findAll();
        return Result.success(scores);
      })
      .tap((scores) =>
        logger.info(`Successfully retrieved ${scores.length} scores.`),
      )
      .catch((error) => {
        logger.error(`Failed to retrieve all scores: ${error.message}`);
        return Result.failure(error);
      });
  }

  /**
   * Updates a score entry in the database.
   * @param {string} id - The ID of the score to update.
   * @param {Object} scoreData - The data to update the score.
   * @returns {Promise<Result>} Result with updated score or error.
   */
  async updateScore(id, scoreData) {
    // Guardamos o ID original em uma constante para usar nos callbacks
    const scoreId = id;

    return Result.success({ id: scoreId, scoreData })
      .tap(() => logger.info(`Attempting to update score with ID: ${scoreId}`))
      .chainAsync(async ({ id, scoreData }) => {
        const updatedScore = await this.scoreRepository.update(id, scoreData);

        if (!updatedScore) {
          throw new Error('Score not found');
        }

        return Result.success(updatedScore);
      })
      .tap((updatedScore) =>
        logger.info(`Score with ID ${scoreId} updated successfully.`),
      )
      .catch((error) => {
        const logMessage =
          error.message === 'Score not found'
            ? `Score with ID ${scoreId} not found for update.`
            : `Failed to update score with ID ${scoreId}: ${error.message}`;

        if (error.message === 'Score not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }

        return Result.failure(error);
      });
  }

  /**
   * Deletes a score entry from the database.
   * @param {string} id - The ID of the score to delete.
   * @returns {Promise<Result>} Result with deleted score or error.
   */
  async deleteScore(id) {
    // Guardamos o ID original em uma constante
    const scoreId = id;

    return Result.success(scoreId)
      .tap(() => logger.info(`Attempting to delete score with ID: ${scoreId}`))
      .chainAsync(async (idToDelete) => {
        const deletedScore = await this.scoreRepository.delete(idToDelete);

        if (!deletedScore) {
          throw new Error('Score not found');
        }

        return Result.success(deletedScore);
      })
      .tap((deletedScore) =>
        logger.info(`Score with ID ${scoreId} deleted successfully.`),
      )
      .catch((error) => {
        const logMessage =
          error.message === 'Score not found'
            ? `Score with ID ${scoreId} not found for deletion.`
            : `Failed to delete score with ID ${scoreId}: ${error.message}`;

        if (error.message === 'Score not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }

        return Result.failure(error);
      });
  }

  /**
   * Alternative concise version using fromPromise
   */
  async getAllScoresConcise() {
    logger.info('Attempting to retrieve all scores.');

    return Result.fromPromise(this.scoreRepository.findAll())
      .tap((scores) =>
        logger.info(`Successfully retrieved ${scores.length} scores.`),
      )
      .catch((error) => {
        logger.error(`Failed to retrieve all scores: ${error.message}`);
        return Result.failure(error);
      });
  }
}

export default ScoreService;
