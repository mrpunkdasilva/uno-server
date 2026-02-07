import bcrypt from 'bcrypt';
import PlayerRepository from '../../infra/repositories/player.repository.js';
import logger from '../../config/logger.js';
import playerResponseDtoSchema from '../../presentation/dtos/player/player-response.dto.js';
import Result from '../utils/Result.js';

/**
 * Service class for managing player operations including CRUD operations,
 * authentication, and data validation. Handles password hashing and ensures
 * data integrity through DTO validation.
 */
class PlayerService {
  /**
   * Initializes the PlayerService with a PlayerRepository instance.
   * @param {PlayerRepository} playerRepository - The player repository instance
   */
  constructor(playerRepository) {
    this.playerRepository = playerRepository || new PlayerRepository();
  }

  /**
   * Converts a player document to a response DTO object.
   * @param {Object} player - The player document from repository
   * @returns {Object} Player object formatted as response DTO
   * @private
   */
  _formatPlayerResponse(player) {
    const playerObject = player.toObject ? player.toObject() : player;
    const dataToReturn = {
      ...playerObject,
      id: playerObject._id.toString(),
    };
    return playerResponseDtoSchema.parse(dataToReturn);
  }

  /**
   * Retrieves all players from the database.
   * @returns {Promise<Result>} Result with array of players or error.
   */
  async getAllPlayers() {
    return Result.success()
      .toAsync()
      .tap(() => logger.info('Attempting to retrieve all players.'))
      .chain(async () => {
        const players = await this.playerRepository.findAll();
        return Result.success(players);
      })
      .map((players) => {
        return players.map((player) => this._formatPlayerResponse(player));
      })
      .tap((players) =>
        logger.info(`Successfully retrieved ${players.length} players.`),
      )
      .tapError((error) =>
        logger.error(`Failed to retrieve all players: ${error.message}`),
      )
      .toResult();
  }

  /**
   * Creates a new player with the provided player data.
   * @param {Object} playerData - The data for creating a new player
   * @returns {Promise<Result>} Result with created player or error.
   */
  async createPlayer(playerData) {
    const email = playerData.email;
    const username = playerData.username;

    return Result.success(playerData)
      .toAsync()
      .tap(() =>
        logger.info(
          `Attempting to create a new player with email: ${email} and username: ${username}.`,
        ),
      )
      .chain(async (data) => {
        const existingByEmail = await this.playerRepository.findByEmail(
          data.email,
        );
        if (existingByEmail) {
          throw new Error(`Player with email ${data.email} already exists`);
        }
        return Result.success(data);
      })
      .chain(async (data) => {
        const existingByUsername = await this.playerRepository.findByUsername(
          data.username,
        );
        if (existingByUsername) {
          throw new Error(
            `Player with username ${data.username} already exists`,
          );
        }
        return Result.success(data);
      })
      .chain(async (data) => {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        logger.info('Password hashed for new player.');
        return Result.success({ ...data, password: hashedPassword });
      })
      .chain(async (data) => {
        const newPlayer = await this.playerRepository.create(data);
        if (!newPlayer) {
          throw new Error('Failed to create player - repository returned null');
        }
        return Result.success(newPlayer);
      })
      .map((newPlayer) => this._formatPlayerResponse(newPlayer))
      .tap((player) => logger.info(`Player ${player.id} created successfully.`))
      .tapError((error) => {
        const logMessage = `Failed to create player with email ${email}: ${error.message}`;

        if (
          error.message.includes('already exists') ||
          error.message.includes('already in use')
        ) {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }

  /**
   * Retrieves a player by their ID.
   * @param {string} id - The ID of the player to retrieve
   * @returns {Promise<Result>} Result with player or error.
   */
  async getPlayerById(id) {
    return Result.success(id)
      .toAsync()
      .tap(() => logger.info(`Attempting to retrieve player by ID: ${id}`))
      .chain(async (playerId) => {
        const player = await this.playerRepository.findById(playerId);

        if (!player) {
          throw new Error('Player not found');
        }

        return Result.success(player);
      })
      .map((player) => this._formatPlayerResponse(player))
      .tap(() => logger.info(`Player with ID ${id} retrieved successfully.`))
      .tapError((error) => {
        const logMessage =
          error.message === 'Player not found'
            ? `Player with ID ${id} not found.`
            : `Failed to retrieve player by ID ${id}: ${error.message}`;

        if (error.message === 'Player not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }

  /**
   * Retrieves a player by their email address.
   * @param {string} email - The email address of the player to retrieve
   * @returns {Promise<Result>} Result with player or error.
   */
  async getPlayerByEmail(email) {
    return Result.success(email)
      .toAsync()
      .tap(() =>
        logger.info(`Attempting to retrieve player by email: ${email}`),
      )
      .chain(async (playerEmail) => {
        const player = await this.playerRepository.findByEmail(playerEmail);

        if (!player) {
          throw new Error('Player not found');
        }

        return Result.success(player);
      })
      .map((player) => this._formatPlayerResponse(player))
      .tap(() =>
        logger.info(`Player with email ${email} retrieved successfully.`),
      )
      .tapError((error) => {
        const logMessage =
          error.message === 'Player not found'
            ? `Player with email ${email} not found.`
            : `Failed to retrieve player by email ${email}: ${error.message}`;

        if (error.message === 'Player not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }

  /**
   * Retrieves a player by their username.
   * @param {string} username - The username of the player to retrieve
   * @returns {Promise<Result>} Result with player or error.
   */
  async getPlayerByUsername(username) {
    return Result.success(username)
      .toAsync()
      .tap(() =>
        logger.info(`Attempting to retrieve player by username: ${username}`),
      )
      .chain(async (playerUsername) => {
        const player = await this.playerRepository.findByUsername(
          playerUsername,
        );

        if (!player) {
          throw new Error('Player not found');
        }

        return Result.success(player);
      })
      .map((player) => this._formatPlayerResponse(player))
      .tap(() =>
        logger.info(`Player with username ${username} retrieved successfully.`),
      )
      .tapError((error) => {
        const logMessage =
          error.message === 'Player not found'
            ? `Player with username ${username} not found.`
            : `Failed to retrieve player by username ${username}: ${error.message}`;

        if (error.message === 'Player not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }

  /**
   * Updates an existing player with new data.
   * @param {string} id - The ID of the player to update
   * @param {Object} updateData - The data to update the player with
   * @returns {Promise<Result>} Result with updated player or error.
   */
  async updatePlayer(id, updateData) {
    return Result.success({ id, updateData })
      .toAsync()
      .tap(() => logger.info(`Attempting to update player with ID: ${id}`))
      .chain(async ({ id: playerId, updateData: data }) => {
        const existingPlayer = await this.playerRepository.findById(playerId);
        if (!existingPlayer) {
          throw new Error('Player not found');
        }
        return Result.success({ player: existingPlayer, data });
      })
      .chain(async ({ player: existingPlayer, data }) => {
        if (data.email && data.email !== existingPlayer.email) {
          const conflictingPlayer = await this.playerRepository.findByEmail(
            data.email,
          );
          if (conflictingPlayer) {
            throw new Error(`Email ${data.email} already in use`);
          }
        }
        return Result.success({ player: existingPlayer, data });
      })
      .chain(async ({ player: existingPlayer, data }) => {
        if (data.username && data.username !== existingPlayer.username) {
          const conflictingPlayer = await this.playerRepository.findByUsername(
            data.username,
          );
          if (conflictingPlayer) {
            throw new Error(`Username ${data.username} already in use`);
          }
        }
        return Result.success({ data });
      })
      .chain(async ({ data }) => {
        let updatePayload = { ...data };
        if (data.password) {
          updatePayload.password = await bcrypt.hash(data.password, 10);
          logger.info(`Password updated for player ${id}.`);
        }
        return Result.success({ id, updatePayload });
      })
      .chain(async ({ id: playerId, updatePayload }) => {
        const updatedPlayer = await this.playerRepository.update(
          playerId,
          updatePayload,
        );
        if (!updatedPlayer) {
          throw new Error('Failed to update player');
        }
        return Result.success(updatedPlayer);
      })
      .map((updatedPlayer) => this._formatPlayerResponse(updatedPlayer))
      .tap(() => logger.info(`Player with ID ${id} updated successfully.`))
      .tapError((error) => {
        const logMessage =
          error.message === 'Player not found'
            ? `Player with ID ${id} not found for update.`
            : error.message.includes('already in use')
            ? error.message
            : `Failed to update player with ID ${id}: ${error.message}`;

        if (
          error.message === 'Player not found' ||
          error.message.includes('already in use')
        ) {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }

  /**
   * Deletes a player by their ID.
   * @param {string} id - The ID of the player to delete
   * @returns {Promise<Result>} Result with deleted player or error.
   */
  async deletePlayer(id) {
    return Result.success(id)
      .toAsync()
      .tap(() => logger.info(`Attempting to delete player with ID: ${id}`))
      .chain(async (playerId) => {
        const player = await this.playerRepository.findById(playerId);

        if (!player) {
          throw new Error('Player not found');
        }

        return Result.success(player);
      })
      .chain(async (player) => {
        await this.playerRepository.delete(player._id.toString());
        return Result.success(player);
      })
      .map((player) => this._formatPlayerResponse(player))
      .tap(() => logger.info(`Player with ID ${id} deleted successfully.`))
      .tapError((error) => {
        const logMessage =
          error.message === 'Player not found'
            ? `Player with ID ${id} not found for deletion.`
            : `Failed to delete player with ID ${id}: ${error.message}`;

        if (error.message === 'Player not found') {
          logger.warn(logMessage);
        } else {
          logger.error(logMessage);
        }
      })
      .toResult();
  }
}

export default PlayerService;
