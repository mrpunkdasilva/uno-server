import crypto from 'node:crypto'
import PlayerRepository from '../../infra/repositories/player.repository.js';
import playerResponseDtoSchema from '../../presentation/dtos/playerResponse.dto.js';

class PlayerService {
    constructor() {
        this.playerRepository = new PlayerRepository();
    }

    async getAllPlayers() {
        try {
            return await this.playerRepository.findAll();
        } catch (error) {
            throw error;
        }
    }

    async createPlayer(playerData) {
        try {
            const existingPlayerByEmail = await this.playerRepository.findByEmail(playerData.email);
            if (existingPlayerByEmail) {
                throw new Error('Player with this email already exists');
            }

            const existingPlayerByUsername = await this.playerRepository.findByUsername(playerData.Username);
            if (existingPlayerByUsername) {
                throw new Error('Player with this Username already exists');
            }

            playerData.password = crypto.hash('sha256', playerData.password);
            // ALGORITMO PARA TESTES - TROCAR DEPOIS

            const newUser = await this.playerRepository.create(playerData);
            const userObject = newUser.toObject();
            const dataToReturn = { ...userObject, id: userObject._id.toString() }

            const responseDto = playerResponseDtoSchema.parse(dataToReturn);
            return responseDto;
        } catch (error) {
            throw error;
        }
    }

    async getPlayerById(id) {
        try {
            const player = await this.playerRepository.findById(id);
            if (!player) {
                throw new Error('Player not found');
            }

            return await this.playerRepository.create(playerData);
        } catch (error) {
            throw error;
        }
    }

    async getPlayerById(id) {
        try {
            const player = await this.playerRepository.findById(id);
            if (!player) {
                throw new Error('Player not found');
            }
            return player;
        } catch (error) {
            throw error;
        }
    }

    async getPlayerByEmail(email) {
        try {
            return await this.playerRepository.findByEmail(email);
        } catch (error) {
            throw error;
        }
    }

    async getPlayerByUsername(username) {
        try {
            return await this.playerRepository.findByUsername(username);
        } catch (error) {
            throw error;
        }
    }

    async updatePlayer(id, updateData) {
        try {
            const player = await this.playerRepository.findById(id);
            if (!player) {
                throw new Error('Player not found');
            }

            if (updateData.email && updateData.email !== player.email) {
                const existingPlayer = await this.playerRepository.findByEmail(updateData.email);
                if (existingPlayer) {
                    throw new Error('Email already in use');
                }
            }

            if (updateData.username && updateData.username !== player.username) {
                const existingPlayer = await this.playerRepository.findByUsername(updateData.Username);
                if (existingPlayer) {
                    throw new Error('Username already in use');
                }
            }

            if (updateData.password) updateData.password = crypto.hash('sha256', updateData.password);
            // ALGORITMO DE CRIPTOGRAFIA PARA TESTES

            const updatedPlayer = await this.playerRepository.update(id, updateData);
            const userObject = updatedPlayer.toObject();
            const dataToReturn = { ...userObject, id: userObject._id.toString() }

            const responseDto = playerResponseDtoSchema.parse(dataToReturn);
            return responseDto;
        } catch (error) {
            throw error;
        }
    }

    async deletePlayer(id) {
        try {
            const player = await this.playerRepository.findById(id);
            if (!player) {
                throw new Error('Player not found');
            }
            return await this.playerRepository.delete(id);
        } catch (error) {
            throw error;
        }
    }
}

export default PlayerService;
