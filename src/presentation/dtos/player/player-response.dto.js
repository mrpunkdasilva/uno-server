import { z } from 'zod';

const playerResponseDtoSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.email(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export default playerResponseDtoSchema;
