import PlayerService from '../../core/services/player.service.js';

class PlayerController {
    constructor() {
        this.playerService = new PlayerService();
    }

    async getAllPlayers(req, res) {
        try {
            const players = await this.playerService.getAllPlayers();
            res.status(200).json({
                success: true,
                data: players
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async createPlayer(req, res) {
        try {
            const player = await this.playerService.createPlayer(req.body);
            res.status(201).json({
                success: true,
                data: player
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getPlayerById(req, res) {
        try {
            const player = await this.playerService.getPlayerById(req.params.id);
            res.status(200).json({
                success: true,
                data: player
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updatePlayer(req, res) {
        try {
            const player = await this.playerService.updatePlayer(req.params.id, req.body);
            res.status(200).json({
                success: true,
                data: player
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deletePlayer(req, res) {
        try {
            await this.playerService.deletePlayer(req.params.id);
            res.status(200).json({
                success: true,
                message: 'Player deleted successfully'
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default PlayerController;
