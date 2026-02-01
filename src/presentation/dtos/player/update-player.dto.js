import { z } from 'zod';

const updatePlayerDtoSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .optional(),
  email: z.email('Invalid email format').optional(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters.')
    .optional(),
});

export default updatePlayerDtoSchema;
