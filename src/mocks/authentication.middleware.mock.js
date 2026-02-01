import { jest } from '@jest/globals';

export const mockAuthenticateToken = jest.fn((req, res, next) => {
  req.user = { id: 'initialMockUserId' };
  next();
});
