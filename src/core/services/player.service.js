import bcrypt from 'bcrypt';
import PlayerRepository from '../../infra/repositories/player.repository.js';
import logger from '../../config/logger.js';
import playerResponseDtoSchema from '../../presentation/dtos/player/player-response.dto.js';

/**
 * Service class for managing player operations including CRUD operations,
 * authentication, and data validation. Handles password hashing and ensures
 * data integrity through DTO validation.
 */
class PlayerService {
  /**
   * Initializes the PlayerService with a PlayerRepository instance.
   * @param playerRepository
   */
  constructor(playerRepository) {
    this.playerRepository = playerRepository || new PlayerRepository();
  }

  /**
   * Retrieves all players from the database
   * @returns {Promise<Array>} Array of all player objects formatted as response DTOs
   * @throws {Error} When database operation fails
   */
  async getAllPlayers() {
    logger.info('Attempting to retrieve all players.');
    try {
      const players = await this.playerRepository.findAll();
      logger.info(`Successfully retrieved ${players.length} players.`);
      return players.map((player) => {
        const playerObject = player.toObject();
        const dataToReturn = {
          ...playerObject,
          id: playerObject._id.toString(),
        };
        return playerResponseDtoSchema.parse(dataToReturn);
      });
    } catch (error) {
      logger.error(`Failed to retrieve all players: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a new player with the provided player data
   * @param {Object} playerData - The data for creating a new player
   * @returns {Promise<Object>} The created player object formatted as response DTO
   * @throws {Error} When player with email or username already exists, or when creation fails
   */
  async createPlayer(playerData) {
    logger.info(
      `Attempting to create a new player with email: ${playerData.email}`,
    );
    try {
      const existingPlayerByEmail = await this.playerRepository.findByEmail(
        playerData.email,
      );

      if (existingPlayerByEmail) {
        logger.warn(
          `Player creation failed: Email ${playerData.email} already exists.`,
        );
        throw new Error('Player with this email already exists');
      }

      const existingPlayerByUsername =
        await this.playerRepository.findByUsername(playerData.username);

      if (existingPlayerByUsername) {
        logger.warn(
          `Player creation failed: Username ${playerData.username} already exists.`,
        );
        throw new Error('Player with this username already exists');
      }

      playerData.password = await bcrypt.hash(playerData.password, 10);
      logger.info('Password hashed for new player.');

      const newUser = await this.playerRepository.create(playerData);
      logger.info(`Player ${newUser._id} created successfully.`);
      const userObject = newUser.toObject();
      const dataToReturn = { ...userObject, id: userObject._id.toString() };

      return playerResponseDtoSchema.parse(dataToReturn);
    } catch (error) {
      logger.error(
        `Failed to create player with email ${playerData.email}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves a player by their ID
   * @param {string} id - The ID of the player to retrieve
   * @returns {Promise<Object>} The player object formatted as response DTO
   * @throws {Error} When player is not found
   */
  async getPlayerById(id) {
    logger.info(`Attempting to retrieve player by ID: ${id}`);
    try {
      const player = await this.playerRepository.findById(id);
      if (!player) {
        logger.warn(`Player with ID ${id} not found.`);
        throw new Error('Player not found');
      }

      logger.info(`Player with ID ${id} retrieved successfully.`);
      return playerResponseDtoSchema.parse(player);
    } catch (error) {
      logger.error(`Failed to retrieve player by ID ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves a player by their email address
   * @param {string} email - The email address of the player to retrieve
   * @returns {Promise<Object>} The player object formatted as response DTO
   * @throws {Error} When player is not found
   */
  async getPlayerByEmail(email) {
    logger.info(`Attempting to retrieve player by email: ${email}`);
    try {
      const player = await this.playerRepository.findByEmail(email);
      if (!player) {
        logger.warn(`Player with email ${email} not found.`);
        throw new Error('Player not found');
      }

      logger.info(`Player with email ${email} retrieved successfully.`);
      return playerResponseDtoSchema.parse(player);
    } catch (error) {
      logger.error(
        `Failed to retrieve player by email ${email}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retrieves a player by their username
   * @param {string} username - The username of the player to retrieve
   * @returns {Promise<Object>} The player object formatted as response DTO
   * @throws {Error} When player is not found
   */
  async getPlayerByUsername(username) {
    logger.info(`Attempting to retrieve player by username: ${username}`);
    try {
      const player = await this.playerRepository.findByUsername(username);
      if (!player) {
        logger.warn(`Player with username ${username} not found.`);
        throw new Error('Player not found');
      }

      logger.info(`Player with username ${username} retrieved successfully.`);
      return playerResponseDtoSchema.parse(player);
    } catch (error) {
      logger.error(
        `Failed to retrieve player by username ${username}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Updates an existing player with new data
   * @param {string} id - The ID of the player to update
   * @param {Object} updateData - The data to update the player with
   * @returns {Promise<Object>} The updated player object formatted as response DTO
   * @throws {Error} When player is not found, email/username already in use, or update fails
   */
  async updatePlayer(id, updateData) {
    logger.info(`Attempting to update player with ID: ${id}`);
    try {
      const player = await this.playerRepository.findById(id);
      if (!player) {
        logger.warn(`Player with ID ${id} not found for update.`);
        throw new Error('Player not found');
      }

      if (updateData.email && updateData.email !== player.email) {
        const existingPlayer = await this.playerRepository.findByEmail(
          updateData.email,
        );
        if (existingPlayer) {
          logger.warn(
            `Update failed for player ${id}: Email ${updateData.email} already in use.`,
          );
          throw new Error('Email already in use');
        }
      }

      if (updateData.username && updateData.username !== player.username) {
        const existingPlayer = await this.playerRepository.findByUsername(
          updateData.username,
        );
        if (existingPlayer) {
          logger.warn(
            `Update failed for player ${id}: Username ${updateData.username} already in use.`,
          );
          throw new Error('Username already in use');
        }
      }

      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
        logger.info(`Password updated for player ${id}.`);
      }

      const updatedPlayer = await this.playerRepository.update(id, updateData);
      logger.info(`Player with ID ${id} updated successfully.`);
      const userObject = updatedPlayer.toObject();
      const dataToReturn = { ...userObject, id: userObject._id.toString() };

      return playerResponseDtoSchema.parse(dataToReturn);
    } catch (error) {
      logger.error(`Failed to update player with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes a player by their ID
   * @param {string} id - The ID of the player to delete
   * @returns {Promise<Object>} The deleted player object
   * @throws {Error} When player is not found or deletion fails
   */
  async deletePlayer(id) {
    logger.info(`Attempting to delete player with ID: ${id}`);
    try {
      const player = await this.playerRepository.findById(id);
      if (!player) {
        logger.warn(`Player with ID ${id} not found for deletion.`);
        throw new Error('Player not found');
      }
      await this.playerRepository.delete(id);
      logger.info(`Player with ID ${id} deleted successfully.`);
      return player;
    } catch (error) {
      logger.error(`Failed to delete player with ID ${id}: ${error.message}`);
      throw error;
    }
  }
}

export default PlayerService;
