import { z } from 'zod';

const updateScoreDtoSchema = z.object({
  score: z.number().int('Score must be an integer.').optional(),
});

export default updateScoreDtoSchema;
