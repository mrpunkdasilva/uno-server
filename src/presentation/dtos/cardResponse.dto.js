import { z } from 'zod';

const cardResponseDtoSchema = z.object({
  id: z.string(),
  color: z.enum(['red', 'blue', 'green', 'yellow', 'black']),
  type: z.enum([
    'number',
    'skip',
    'reverse',
    'draw_two',
    'wild',
    'wild_draw_four',
  ]),
  number: z.number().int().min(0).max(9).nullable().optional(),
  playerId: z.string().nullable().optional(),
  gameId: z.string(),
  isInDeck: z.boolean(),
  isDiscarded: z.boolean(),
  orderIndex: z.number().int().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export default cardResponseDtoSchema;
