// this is where we verify the JWT token
// allows only authenticated users to access certain routes
// rejects requests without a valid token

// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const parts = authHeader.split(' ');
  const isBearer = parts.length === 2 && /^Bearer$/i.test(parts[0]);
  const token = isBearer ? parts[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Access token missing or malformed' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // adjust if you use RS256 with a public key
      audience: process.env.JWT_AUD || undefined,
      issuer: process.env.JWT_ISS || undefined,
      clockTolerance: 5
    });

    // Maintain your existing shape & fallbacks:
    req.user = {
      userId: payload.sub || payload.userId || payload.id || payload._id
    };
    if (!req.user.userId) {
      return res.status(403).json({ message: 'Token missing user id (sub)' });
    }
    return next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
