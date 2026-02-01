import { jest } from '@jest/globals';

// A instância do mock que pode ser acessada e configurada
export const mockAuthenticateToken = jest.fn((req, res, next) => {
  req.user = { id: 'initialMockUserId' }; // Default value, can be overridden
  next();
});
