import Game from '../models/game.model.js';

/**
 *
 */
class GameRepository {
  /**
   *
   */
  async findAll() {
    return await Game.find();
  }

  /**
   *
   * @param gameData
   */
  async createGame(gameData) {
    const game = new Game(gameData);
    return await game.save();
  }

  /**
   *
   * @param id
   */
  async findById(id) {
    return await Game.findById(id);
  }

  /**
   *
   * @param id
   * @param updateData
   */
  async update(id, updateData) {
    return Game.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );
  }

  /**
   *
   * @param id
   */
  async delete(id) {
    return await Game.findByIdAndDelete(id);
  }
}

export default GameRepository;
