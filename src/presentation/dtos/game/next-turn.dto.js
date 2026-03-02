import { z } from 'zod';

const nextTurnDtoSchema = z.object({
  players: z
    .array(
      z.union([
        z.string(),
        z.object({ username: z.string() }),
        z.object({ _id: z.string() }),
      ]),
    )
    .min(1),
  currentPlayerIndex: z.number().int().min(0),
});

export default nextTurnDtoSchema;
