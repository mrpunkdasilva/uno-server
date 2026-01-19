import Player from '../models/player.model.js';

class PlayerRepository {
  async findAll() {
    return await Player.find();
  }

  async create(playerData) {
    const player = new Player(playerData);
    return await player.save();
  }

  async findById(id) {
    return await Player.findById(id);
  }

  async findByEmail(email) {
    return await Player.findOne({ email });
  }

  async findByUsername(username) {
    return await Player.findOne({ username });
  }

  async update(id, updateData) {
    return await Player.findByIdAndUpdate(id, updateData, { new: true });
  }

  async delete(id) {
    return await Player.findByIdAndDelete(id);
  }
}

export default PlayerRepository;
