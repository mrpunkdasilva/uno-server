import Game from '../models/game.model.js';

class GameRepository {
  async findAll() {
    return await Game.find();
  }

  async createGame(gameData) {
    const game = new Game(gameData);
    return await game.save();
  }

  async findById(id) {
    return await Game.findById(id);
  }

  async update(id, updateData) {
    return Game.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  async delete(id) {
    return await Game.findByIdAndDelete(id);
  }
}

export default GameRepository;
