import { z } from 'zod';
const joinGameDtoSchema = z.object({
  gameId: z
    .string({
      required_error: 'Game ID is required',
      invalid_type_error: 'Game ID must be a string',
    })
    .min(1),
});

export default joinGameDtoSchema;
