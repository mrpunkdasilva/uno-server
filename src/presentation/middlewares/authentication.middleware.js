import jwt from 'jsonwebtoken';
import AuthService from '../../core/services/auth.service.js';

const authService = new AuthService();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is required',
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is required',
      });
    }

    const isTokenBlacklisted = await authService.verifyTokenIsBlacklisted(
      token,
    );
    if (isTokenBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token invalidated',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

export default authMiddleware;
