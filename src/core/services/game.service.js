import gameRepository from "../../infra/repositories/game.repository";
import gameResponseDtoSchema from "../../presentation/dtos/gameResponse";
import updateGameDtoSchema from "../../presentation/dtos/updateGame";

class gameService{
    constructor(){
        this.gameRepository() = new gameRepository();
    }

    async getAllGames() {
        try {
            return await this.gameRepository.findAll();
        } catch (error) {
            throw error;
        }
    }

    async createGame(gameData){
        try {
            const game = await this.gameRepository.createGame(gameData);

            // transforma em DTO de resposta
            return gameResponseDtoSchema.parse({
                id: game._id.toString(),
                title: game.title,
                status: game.status,
                maxPlayers: game.maxPlayers,
                createdAt: game.createdAt,
                updatedAt: game.updatedAt
            });

        } catch (error) {
            throw error;
        }
    }

    async updateGame(id, updateData) {
        try {
            
            const validatedData = updateGameDtoSchema.parse(updateData);

            const updatedGame = await this.gameRepository.update(id, validatedData);

            if (!updatedGame) {
            throw new Error("Game not found");
            }

            return gameResponseDtoSchema.parse({
            id: updatedGame._id.toString(),
            title: updatedGame.title,
            status: updatedGame.status,
            maxPlayers: updatedGame.maxPlayers,
            createdAt: updatedGame.createdAt,
            updatedAt: updatedGame.updatedAt
            });

        } catch (error) {
            throw error;
        }
    }

    async deleteGame(id) {
        try {
            const game = await this.gameRepository.findById(id);
            if (!game) {
                throw new Error('Game not found');
            }
            return await this.gameRepository.delete(id);
        } catch (error) {
            throw error;
        }
    }

}