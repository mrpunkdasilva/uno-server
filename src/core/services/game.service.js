import GameRepository from '../../infra/repositories/gameRepository.js';
import gameResponseDtoSchema from '../../presentation/dtos/gameResponse.dto.js';
import updateGameDtoSchema from '../../presentation/dtos/updateGame.dto.js';

class GameService {
  constructor() {
    this.gameRepository = new GameRepository();
  }

  async getAllGames() {
    return await this.gameRepository.findAll();
  }
  async getGameById(id) {
    const game = await this.gameRepository.findById(id);
    if (!game) {
      throw new Error('Game not found');
    }
    return game;
  }

  async createGame(gameData) {
    const game = await this.gameRepository.createGame(gameData);

    // transforma em DTO de resposta
    return gameResponseDtoSchema.parse({
      id: game._id.toString(),
      title: game.title,
      status: game.status,
      maxPlayers: game.maxPlayers,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    });
  }

  async updateGame(id, updateData) {
    const validatedData = updateGameDtoSchema.parse(updateData);

    const updatedGame = await this.gameRepository.update(id, validatedData);

    if (!updatedGame) {
      throw new Error('Game not found');
    }

    return gameResponseDtoSchema.parse({
      id: updatedGame._id.toString(),
      title: updatedGame.title,
      status: updatedGame.status,
      maxPlayers: updatedGame.maxPlayers,
      createdAt: updatedGame.createdAt,
      updatedAt: updatedGame.updatedAt,
    });
  }

  async deleteGame(id) {
    const game = await this.gameRepository.findById(id);
    if (!game) {
      throw new Error('Game not found');
    }
    return await this.gameRepository.delete(id);
  }
}
export default GameService;
