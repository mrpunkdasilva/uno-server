import bcrypt from 'bcrypt';
import PlayerRepository from '../../infra/repositories/player.repository.js';
import playerResponseDtoSchema from '../../presentation/dtos/playerResponse.dto.js';

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
    const players = await this.playerRepository.findAll();
    return players.map((player) => {
      const playerObject = player.toObject();
      const dataToReturn = {
        ...playerObject,
        id: playerObject._id.toString(),
      };
      return playerResponseDtoSchema.parse(dataToReturn);
    });
  }

  /**
   * Creates a new player with the provided player data
   * @param {Object} playerData - The data for creating a new player
   * @returns {Promise<Object>} The created player object formatted as response DTO
   * @throws {Error} When player with email or username already exists, or when creation fails
   */
  async createPlayer(playerData) {
    const existingPlayerByEmail = await this.playerRepository.findByEmail(
      playerData.email,
    );

    if (existingPlayerByEmail) {
      throw new Error('Player with this email already exists');
    }

    const existingPlayerByUsername = await this.playerRepository.findByUsername(
      playerData.username,
    );

    if (existingPlayerByUsername) {
      throw new Error('Player with this username already exists');
    }

    playerData.password = await bcrypt.hash(playerData.password, 10);

    const newUser = await this.playerRepository.create(playerData);
    const userObject = newUser.toObject();
    const dataToReturn = { ...userObject, id: userObject._id.toString() };

    return playerResponseDtoSchema.parse(dataToReturn);
  }

  /**
   * Retrieves a player by their ID
   * @param {string} id - The ID of the player to retrieve
   * @returns {Promise<Object>} The player object formatted as response DTO
   * @throws {Error} When player is not found
   */
  async getPlayerById(id) {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new Error('Player not found');
    }

    return playerResponseDtoSchema.parse(player);
  }

  /**
   * Retrieves a player by their email address
   * @param {string} email - The email address of the player to retrieve
   * @returns {Promise<Object>} The player object formatted as response DTO
   * @throws {Error} When player is not found
   */
  async getPlayerByEmail(email) {
    const player = await this.playerRepository.findByEmail(email);
    if (!player) {
      throw new Error('Player not found');
    }

    return playerResponseDtoSchema.parse(player);
  }

  /**
   * Retrieves a player by their username
   * @param {string} username - The username of the player to retrieve
   * @returns {Promise<Object>} The player object formatted as response DTO
   * @throws {Error} When player is not found
   */
  async getPlayerByUsername(username) {
    const player = await this.playerRepository.findByUsername(username);
    if (!player) {
      throw new Error('Player not found');
    }

    return playerResponseDtoSchema.parse(player);
  }

  /**
   * Updates an existing player with new data
   * @param {string} id - The ID of the player to update
   * @param {Object} updateData - The data to update the player with
   * @returns {Promise<Object>} The updated player object formatted as response DTO
   * @throws {Error} When player is not found, email/username already in use, or update fails
   */
  async updatePlayer(id, updateData) {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new Error('Player not found');
    }

    if (updateData.email && updateData.email !== player.email) {
      const existingPlayer = await this.playerRepository.findByEmail(
        updateData.email,
      );
      if (existingPlayer) {
        throw new Error('Email already in use');
      }
    }

    if (updateData.username && updateData.username !== player.username) {
      const existingPlayer = await this.playerRepository.findByUsername(
        updateData.username,
      );
      if (existingPlayer) {
        throw new Error('Username already in use');
      }
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedPlayer = await this.playerRepository.update(id, updateData);
    const userObject = updatedPlayer.toObject();
    const dataToReturn = { ...userObject, id: userObject._id.toString() };

    return playerResponseDtoSchema.parse(dataToReturn);
  }

  /**
   * Deletes a player by their ID
   * @param {string} id - The ID of the player to delete
   * @returns {Promise<Object>} The deleted player object
   * @throws {Error} When player is not found or deletion fails
   */
  async deletePlayer(id) {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new Error('Player not found');
    }
    return await this.playerRepository.delete(id);
  }
}

export default PlayerService;
