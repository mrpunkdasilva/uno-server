import { z } from 'zod';

const updateCardDtoSchema = z.object({
  color: z
    .enum(['red', 'blue', 'green', 'yellow', 'black'], {
      errorMap: () => ({
        message: 'Color must be one of: red, blue, green, yellow, black',
      }),
    })
    .optional(),
  type: z
    .enum(['number', 'skip', 'reverse', 'draw_two', 'wild', 'wild_draw_four'], {
      errorMap: () => ({
        message:
          'Type must be one of: number, skip, reverse, draw_two, wild, wild_draw_four',
      }),
    })
    .optional(),
  number: z.number().int().min(0).max(9).nullable().optional(),
  playerId: z.string().nullable().optional(),
  gameId: z.string().min(1, 'gameId must be a non-empty string').optional(),
  isInDeck: z.boolean().optional(),
  isDiscarded: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

export default updateCardDtoSchema;
