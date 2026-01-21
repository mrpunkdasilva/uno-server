import { z } from 'zod';

const createScoreDtoSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required.'),
  matchId: z.string().min(1, 'Match ID is required.'),
  score: z.number().int('Score must be an integer.'),
});

export default createScoreDtoSchema;
