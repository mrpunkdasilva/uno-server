import bcrypt from 'bcrypt';
import PlayerRepository from '../../infra/repositories/player.repository.js';
import playerResponseDtoSchema from '../../presentation/dtos/playerResponse.dto.js';

/**
 *
 */
class PlayerService {
  /**
   *
   * @param playerRepository
   */
  constructor(playerRepository) {
    this.playerRepository = playerRepository || new PlayerRepository();
  }

  /**
   *
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
   *
   * @param playerData
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

    const responseDto = playerResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  /**
   *
   * @param id
   */
  async getPlayerById(id) {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new Error('Player not found');
    }

    const responseDto = playerResponseDtoSchema.parse(player);
    return responseDto;
  }

  /**
   *
   * @param email
   */
  async getPlayerByEmail(email) {
    const player = await this.playerRepository.findByEmail(email);
    if (!player) {
      throw new Error('Player not found');
    }

    const responseDto = playerResponseDtoSchema.parse(player);
    return responseDto;
  }

  /**
   *
   * @param username
   */
  async getPlayerByUsername(username) {
    const player = await this.playerRepository.findByUsername(username);
    if (!player) {
      throw new Error('Player not found');
    }

    const responseDto = playerResponseDtoSchema.parse(player);
    return responseDto;
  }

  /**
   *
   * @param id
   * @param updateData
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

    const responseDto = playerResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  /**
   *
   * @param id
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
