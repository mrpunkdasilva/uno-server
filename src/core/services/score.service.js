/* eslint-disable no-unused-vars */
import logger from '../../config/logger.js';
import ScoreRepository from '../../infra/repositories/score.repository.js';
import Result from '../utils/Result.js';

/**
 * Service to handle score business logic using Result Async Functor.
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
}

export default ScoreService;
