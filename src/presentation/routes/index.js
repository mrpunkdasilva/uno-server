import { Router } from 'express'

import playerRoutes from './player.routes.js'
import gameRoutes from  '../routes/game.routes.js'
import authRoutes from '../routes/auth.routes.js'

import authentication from '../middlewares/authentication.middleware.js'

const router = Router()

router.use('/api/auth', authRoutes)
router.use('/api/players', authentication, playerRoutes)
router.use('/api/games', authentication, gameRoutes)

export default router;
