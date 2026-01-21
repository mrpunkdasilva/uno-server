import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import redisClient from '../../config/redis.js'
import PlayerRepository from '../../infra/repositories/player.repository.js';

class AuthService {
    constructor() {
        this.playerRepository = new PlayerRepository();
    }

    async login(email, password) {
        try {
            const user = await this.playerRepository.findByEmail(email);

            if (!user) {
                throw new Error('Invalid credentials');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid credentials');
            }

            const accessToken = this.generateToken(user, process.env.JWT_SECRET, '15m');
            const refreshToken = this.generateToken(user, process.env.JWT_REFRESH_SECRET, '7d');

            await redisClient.set(`session:${user._id}`, refreshToken, {
                EX: 7 * 24 * 60 * 60 // 7 dias
            })
            
            return {
                success: true,
                accessToken,
                refreshToken
            };
        } catch (error) {
            throw new Error('Authentication failed: ' + error.message);
        }
    }

    async logout(userId, accessToken) {
        // Removendo a sessão (Refresh Token)
        await redisClient.del(`session:${userId}`);

        // Colocando o Access Token atual na Blacklist se ele ainda não expirou
        if (accessToken) {
            try {
                const decoded = jwt.decode(accessToken);
                if (decoded && decoded.exp) {
                    const currentTime = Math.floor(Date.now() / 1000);
                    const timeToLive = decoded.exp - currentTime;
                    if (timeToLive > 0) {
                        await redisClient.set(`blacklist:${accessToken}`, 'blacklisted', {
                            'EX': timeToLive
                        })
                    }
                } 
            } catch(error) {
                console.error("Error adding token in blacklist")
            }
        }
        
        try {
            return {
                success: true,
                message: 'Logged out successfully'
            };
        } catch (error) {
            throw new Error('Logout failed: ' + error.message);
        }
    }

    async refreshToken(refreshToken) {
        try {
            if (!refreshToken) {
                throw new Error('Refresh token is required');
            }

            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            const storedToken = await redisClient.get(`session:${decoded.id}`);
            if (!storedToken || storedToken !== refreshToken) {
                throw new Error('Refresh token invalid or revoked');
            }

            const newToken = this.generateToken({ id: decoded.id }, process.env.JWT_SECRET, '15m');
            
            return {
                success: true,
                token: newToken
            };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Refresh token has expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid refresh token');
            }
            throw new Error('Token refresh failed: ' + error.message);
        }
    }

    generateToken(user, secret, expiresIn) {
        const payload = {
            id: user._id,
        };

        const token = jwt.sign(payload, secret, { expiresIn: expiresIn });

        return token;
    }

    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    async verifyTokenIsBlacklisted(token) {
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        return isBlacklisted;
    }
}

export default AuthService;
