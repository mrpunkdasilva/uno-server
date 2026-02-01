import express from 'express';
import PlayerController from '../controllers/player.controller.js';

import createPlayerDto from '../dtos/player/create-player.dto.js';
import updatePlayerDto from '../dtos/player/update-player.dto.js';

import validateDto from '../middlewares/validateDto.middleware.js';

const router = express.Router();
const playerController = new PlayerController();

router.get('/', (req, res) => playerController.getAllPlayers(req, res));
router.post('/', validateDto(createPlayerDto), (req, res) =>
  playerController.createPlayer(req, res),
);
router.get('/:id', (req, res) => playerController.getPlayerById(req, res));
router.put('/:id', validateDto(updatePlayerDto), (req, res) =>
  playerController.updatePlayer(req, res),
);
router.delete('/:id', (req, res) => playerController.deletePlayer(req, res));

export default router;
