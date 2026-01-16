import Player from '../models/player.model.js';

class PlayerRepository {
    async findAll() {
        try {
            return await Player.find();
        } catch (error) {
            throw error;
        }
    }

    async create(playerData) {
        try {
           const player = new Player(playerData);
            return await player.save();
        } catch (error) {
            throw error;
        }
    }

    async findById(id) {
        try {
            return await Player.findById(id);
        } catch (error) {
            throw error;
        }
    }

    async findByEmail(email) {
        try {
            return await Player.findOne({ email });
        } catch (error) {
            throw error;
        }
    }

    async findByUsername(username) {
        try {
            return await Player.findOne({ username });
        } catch (error) {
            throw error;
        }
    }

    async update(id, updateData) {
        try {
            return await Player.findByIdAndUpdate(id, updateData, { new: true });
        } catch (error) {
            throw error;
        }
    }

    async delete(id) {
        try {
            return await Player.findByIdAndDelete(id);
        } catch (error) {
            throw error;
        }
    }
}

export default PlayerRepository;
