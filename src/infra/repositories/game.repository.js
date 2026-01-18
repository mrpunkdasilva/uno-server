import Game from '../models/game.model.js'

class gameRepository{
    async findAll() {
        try {
            return await Game.find();
        } catch (error) {
            throw error;
        }
    }

    async createGame(gameData){
        try {
           const game = new Game(gameData);
            return await game.save();
        } catch (error) {
            throw error;
        }
    }

    async findById(id) {
        try {
            return await Game.findById(id);
        } catch (error) {
            throw error;
        }
    }

    async update(id, updateData) {
        return Game.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
        );
    }

    async delete(id) {
        try {
            return await Game.findByIdAndDelete(id);
        } catch (error) {
            throw error;
        }
    }
}

export default gameRepository;