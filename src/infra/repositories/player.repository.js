import Player from '../models/player.model.js';

/**
 *
 */
class PlayerRepository {
  /**
   *
   */
  async findAll() {
    return await Player.find();
  }

  /**
   *
   * @param playerData
   */
  async create(playerData) {
    const player = new Player(playerData);
    return await player.save();
  }

  /**
   *
   * @param id
   */
  async findById(id) {
    return await Player.findById(id);
  }

  /**
   *
   * @param email
   */
  async findByEmail(email) {
    return await Player.findOne({ email });
  }

  /**
   *
   * @param username
   */
  async findByUsername(username) {
    return await Player.findOne({ username });
  }

  /**
   *
   * @param id
   * @param updateData
   */
  async update(id, updateData) {
    return await Player.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   *
   * @param id
   */
  async delete(id) {
    return await Player.findByIdAndDelete(id);
  }
}

export default PlayerRepository;
