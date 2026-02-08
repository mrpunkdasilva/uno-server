import { z } from 'zod';

const createGameDtoSchema = z.object({
  name: z
    .string()
    .min(3, 'Game must have at least 3 letters as name (ex: UNO)'),
  rules: z.string().min(10, 'Rules must have at least 10 characters'),
  maxPlayers: z
    .number()
    .min(2, 'The game must have at least 2 players')
    .default(4),
  minPlayers: z
    .number()
    .min(2, 'A game needs a minimum of 2 players')
    .default(2),
});

export default createGameDtoSchema;
