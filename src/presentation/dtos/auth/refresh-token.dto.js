// Refresh Token Dto using Zod
import { z } from 'zod';

const refreshTokenDto = z.object({
  refreshToken: z.jwt('Invalid token format.'),
});

export default refreshTokenDto;
