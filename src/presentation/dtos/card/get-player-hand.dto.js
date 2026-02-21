import { z } from 'zod';

const getPlayerHandDtoSchema = z.object({
  player: z
    .string({
      required_error: 'Player ID is required',
      invalid_type_error: 'Player ID must be a string',
    })
    .min(1, 'Player ID cannot be empty'),
});

export default getPlayerHandDtoSchema;