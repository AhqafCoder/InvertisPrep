import jwt from 'jsonwebtoken';

export const authenticateJWT = async (req, res, next) => {
  try {
    let token = req.headers.authorization || req.cookies?.token;

    if (!token) {
      console.log(`[Auth] No token provided for ${req.method} ${req.originalUrl}`);
      res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
      return;
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    token = token.trim();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error(`[Auth] JWT Verification failed: ${error.message}`);
    res.status(401).json({
      success: false,
      message: 'Your session has expired or is invalid. Please log in again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization || req.cookies?.token;
  if (!token) return next();
  return authenticateJWT(req, res, next);
};
