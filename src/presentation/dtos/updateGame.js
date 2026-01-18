import { z } from 'zod';


const updateGameDtoSchema = z.object({
    title: z.string().min(3, "Game must have at least 3 letters as name (ex: UNO)").optional(),
    status: z.enum(["Active", "Pause", "Ended"]).optional(),
    maxPlayers : z.number().optional()
})

export default updateGameDtoSchema;