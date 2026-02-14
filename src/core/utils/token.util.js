import jwt from 'jsonwebtoken';

export function generateToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

export function decodeToken(token) {
  return jwt.decode(token);
}