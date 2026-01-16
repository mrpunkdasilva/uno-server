import express from 'express';
import PlayerController from '../controllers/player.controller.js';

const router = express.Router();
const playerController = new PlayerController();

router.get('/', (req, res) => playerController.getAllPlayers(req, res));
router.post('/', (req, res) => playerController.createPlayer(req, res));
router.get('/:id', (req, res) => playerController.getPlayerById(req, res));
router.put('/:id', (req, res) => playerController.updatePlayer(req, res));
router.delete('/:id', (req, res) => playerController.deletePlayer(req, res));

export default router;
