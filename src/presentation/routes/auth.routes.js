import { Router } from 'express';

import AuthController from '../controllers/auth.controller.js';

import createPLayerDto from '../dtos/player/create-player.dto.js';
import loginDto from '../dtos/auth/login.dto.js';
import refreshTokenDto from '../dtos/auth/refresh-token.dto.js';

import validateDto from '../middlewares/validateDto.middleware.js';
import { authenticateToken } from '../middlewares/authentication.middleware.js';

const router = Router();
const authController = new AuthController();

router.post('/register', validateDto(createPLayerDto), (req, res) =>
  authController.register(req, res),
);
router.post('/login', validateDto(loginDto), (req, res) =>
  authController.login(req, res),
);
router.post('/refresh-token', validateDto(refreshTokenDto), (req, res) =>
  authController.refreshToken(req, res),
);

router.post('/logout', authenticateToken, (req, res) =>
  authController.logout(req, res),
);
router.get('/profile', authenticateToken, (req, res) =>
  authController.getAuthenticatedPlayerProfile(req, res),
);

export default router;
