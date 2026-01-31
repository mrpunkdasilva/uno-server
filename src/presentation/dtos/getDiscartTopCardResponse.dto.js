import { z } from 'zod';

const discardTopCardResponseDtoSchema = z.object({
  game_id: z.string(),
  top_card: z
    .object({
      card_id: z.string().optional(),
      color: z.enum(['red', 'blue', 'green', 'yellow', 'wild']).optional(),
      value: z.string().optional(),
      type: z.enum(['number', 'action', 'wild']).optional(),
      played_by: z.string().optional(),
      played_at: z.date().optional(),
    })
    .nullable()
    .optional(),
  message: z.string().optional(),
  discard_pile_size: z.number().optional(),
  initial_card: z
    .object({
      color: z.enum(['red', 'blue', 'green', 'yellow']).optional(),
      value: z.string().optional(),
      type: z.enum(['number']).optional(),
    })
    .optional(),
  recent_cards: z
    .array(
      z.object({
        color: z.enum(['red', 'blue', 'green', 'yellow', 'wild']),
        value: z.string(),
        type: z.enum(['number', 'action', 'wild']),
        played_by: z.string().optional(),
        order: z.number().optional(),
      }),
    )
    .optional(),
});

export default discardTopCardResponseDtoSchema;
