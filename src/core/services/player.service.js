import crypto from 'node:crypto';
import PlayerRepository from '../../infra/repositories/player.repository.js';
import playerResponseDtoSchema from '../../presentation/dtos/playerResponse.dto.js';

class PlayerService {
  constructor(playerRepository) {
    this.playerRepository = playerRepository || new PlayerRepository();
  }

  async getAllPlayers() {
    return await this.playerRepository.findAll();
  }

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

    playerData.password = crypto
      .createHash('sha256')
      .update(playerData.password)
      .digest('hex');
    // ALGORITMO PARA TESTES - TROCAR DEPOIS

    const newUser = await this.playerRepository.create(playerData);
    const userObject = newUser.toObject();
    const dataToReturn = { ...userObject, id: userObject._id.toString() };

    const responseDto = playerResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  async getPlayerById(id) {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new Error('Player not found');
    }
    return player;
  }

  async getPlayerByEmail(email) {
    return await this.playerRepository.findByEmail(email);
  }

  async getPlayerByUsername(username) {
    return await this.playerRepository.findByUsername(username);
  }

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

    if (updateData.password)
      updateData.password = crypto
        .createHash('sha256')
        .update(updateData.password)
        .digest('hex');
    // ALGORITMO DE CRIPTOGRAFIA PARA TESTES

    const updatedPlayer = await this.playerRepository.update(id, updateData);
    const userObject = updatedPlayer.toObject();
    const dataToReturn = { ...userObject, id: userObject._id.toString() };

    const responseDto = playerResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  async deletePlayer(id) {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new Error('Player not found');
    }
    return await this.playerRepository.delete(id);
  }
}

export default PlayerService;
