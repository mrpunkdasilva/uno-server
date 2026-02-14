import jwt from 'jsonwebtoken';

/**
 *
 * @param payload
 * @param secret
 * @param expiresIn
 */
export function generateToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 *
 * @param token
 * @param secret
 */
export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

/**
 *
 * @param token
 */
export function decodeToken(token) {
  return jwt.decode(token);
}
