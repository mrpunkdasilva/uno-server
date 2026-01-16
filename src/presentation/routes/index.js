import { Router } from 'express'
import playerRoutes from './player.routes.js'

const router = Router()

router.use('/api/players', playerRoutes)

export default router;
