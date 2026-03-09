import jwt from 'jsonwebtoken';
import {
  generateToken,
  verifyToken,
} from '../../../src/core/utils/token.util.js';

describe('token.util', () => {
  const user = { id: 'u1', username: 'user1' };
  const secret = 'test-secret';
  const expiresIn = '1h';

  describe('generateToken', () => {
    it('should generate a valid JWT', () => {
      const token = generateToken(user, secret, expiresIn);
      expect(token).toBeDefined();
      const decoded = jwt.verify(token, secret);
      expect(decoded.id).toBe(user.id);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = jwt.sign(user, secret);
      const decoded = verifyToken(token, secret);
      expect(decoded.id).toBe(user.id);
    });

    it('should throw for invalid token', () => {
      expect(() => verifyToken('invalid', secret)).toThrow();
    });
  });
});
