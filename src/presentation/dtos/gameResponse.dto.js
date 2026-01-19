import { z } from 'zod';

const gameResponseDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  maxPlayers: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export default gameResponseDtoSchema;
