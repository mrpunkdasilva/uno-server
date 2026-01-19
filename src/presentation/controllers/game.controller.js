import GameService from '../../core/services/game.service.js';

class GameController {
  constructor() {
    this.gameService = new GameService();
  }

  async getAllGames(req, res) {
    try {
      const games = await this.gameService.getAllGames();
      res.status(200).json({
        success: true,
        data: games,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async createGame(req, res) {
    try {
      const game = await this.gameService.createGame(req.body);
      res.status(201).json({
        success: true,
        data: game,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getGameById(req, res) {
    try {
      const game = await this.gameService.getGameById(req.params.id);
      res.status(200).json({
        success: true,
        data: game,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateGame(req, res) {
    try {
      const updatedGame = await this.gameService.updateGame(
        req.params.id,
        req.body,
      );

      res.status(200).json({
        success: true,
        data: updatedGame,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteGame(req, res) {
    try {
      await this.gameService.deleteGame(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Game deleted successfully',
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default GameController;
