import AuthService from "../../core/services/auth.service.js";
import PlayerService from "../../core/services/player.service.js" 

class AuthController {
    constructor() {
        this.authService = new AuthService();
        this.playerService = new PlayerService();
    }

    async register(req, res) {
        try {
            const { email, password, username } = req.body;
            
            if (!email || !password || !username) {
                return res.status(400).json({
                    success: false,
                    message: 'Email, password and username are required'
                });
            }

            const playerData = { email, password, username };
            const newPlayer = await this.playerService.createPlayer(playerData);

            res.status(201).json({
                success: true,
                data: newPlayer,
                message: 'Player registered successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const result = await this.authService.login(email, password);

            res.status(200).json(result);
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }

    async logout(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({
                    success: false,
                    message: 'Authorization header is required'
                });
            }

            const token = authHeader.split(' ')[1]; // Bearer <token>
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token is required'
                });
            }

            await this.authService.logout(req.user.id, token);
            
            res.status(200).json({
                success: true,
                message: 'Logout successful'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token is required'
                });
            }

            const token = await this.authService.refreshToken(refreshToken);
            res.status(200).json(token)
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAuthenticatedPlayerProfile(req, res) {
        try {
            const userId = req.user.id;
            
            const player = await this.playerService.getPlayerById(userId);
            
            if (!player) {
                return res.status(404).json({
                    success: false,
                    message: 'Player not found'
                });
            }

            res.status(200).json({
                success: true,
                data: player
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default AuthController;