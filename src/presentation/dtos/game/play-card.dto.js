import { z } from 'zod';

const playCardDtoSchema = z.object({
  cardId: z
    .string()
    .min(1, 'Card ID is required')
    .describe('The ID of the card to play'),
  chosenColor: z
    .enum(['red', 'blue', 'green', 'yellow'])
    .optional()
    .describe('The color chosen for wild cards (required only for wild cards)'),
});

export default playCardDtoSchema;
