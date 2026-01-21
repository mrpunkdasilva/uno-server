import { z } from 'zod';

const loginDtoSchema = z.object({
  email: z.email('Invalid email format').min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
});

export default loginDtoSchema;