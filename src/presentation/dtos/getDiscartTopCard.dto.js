import { z } from 'zod';

const getDiscardTopCardDtoSchema = z.object({
  game_id: z
    .string({
      required_error: 'Game ID is required',
      invalid_type_error: 'Game ID must be a string',
    })
    .min(1, 'Game ID cannot be empty'),
});

export default getDiscardTopCardDtoSchema;
