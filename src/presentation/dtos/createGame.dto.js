import { z } from 'zod';

const createGameDtoSchema = z.object({
  title: z
    .string()
    .min(3, 'Game must have at least 3 letters as name (ex: UNO)'),
  status: z.enum(['Active', 'Pause', 'Ended']),
  maxPlayers: z.number().min(2, 'The game must have at least 2 players'),
});

export default createGameDtoSchema;
