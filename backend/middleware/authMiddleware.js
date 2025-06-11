// this is where we verify the JWT token
// allows only authenticated users to access certain routes
// rejects requests without a valid token

const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = {
      userId: user.userId || user.id || user._id // fallback in case structure varies
    };
    next();
  });
};