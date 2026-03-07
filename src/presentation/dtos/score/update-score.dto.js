import { z } from 'zod';

const updateScoreDtoSchema = z.object({
  score: z
    .number()
    .int('Score must be an integer.')
    .min(0, 'Score cannot be negative.') // ADDED VALIDATION: prevent negative score
    .optional(),
});

export default updateScoreDtoSchema;
