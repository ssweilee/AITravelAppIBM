const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.js');

// Helper to generate a random refresh token
function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

const signup = async (req, res) => {
  const { email, password, firstName, lastName, dob, country, travelStyle } = req.body;
  console.log("SignUp request: ", email);
  console.log("FULL SIGNUP BODY:", req.body);

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User alreadyy exist'});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword, 
      firstName,
      lastName,
      dob,
      country,
      travelStyle
    });

    await newUser.save();
    const sanitized = { _id: newUser._id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, travelStyle: newUser.travelStyle, avgBudget: newUser.avgBudget || null, tags: newUser.tags || [], recentDestinations: newUser.recentDestinations || [] };
    res.status(201).json({ message: 'Signup successful', userId: newUser.id, user: sanitized });
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  console.log("Login request: ", email);

  try {
    const currentUser = await User.findOne({ email });
    if (!currentUser) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log("Retrieved user:", currentUser);
    const isPasswordValid = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: currentUser._id, email: currentUser.email },
      process.env.JWT_SECRET || 'dev_secret', 
      { expiresIn: '1h' }
    );

    // Generate and save refresh token
    const refreshToken = generateRefreshToken();
    currentUser.refreshToken = refreshToken;
    await currentUser.save();

    const sanitized = { _id: currentUser._id, email: currentUser.email, firstName: currentUser.firstName, lastName: currentUser.lastName, travelStyle: currentUser.travelStyle, avgBudget: currentUser.avgBudget || null, tags: currentUser.tags || [], recentDestinations: currentUser.recentDestinations || [] };
    res.json({ message: 'Login successul', token, refreshToken, user: sanitized });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Endpoint to refresh JWT using refresh token (rotates refresh token)
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }
  // Quick validation: reject if it looks like a JWT (contains dots)
  if (refreshToken.includes('.')) {
    return res.status(400).json({ message: 'Provided token is not a refresh token' });
  }
  try {
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    console.log(`[auth.refresh] Refresh token valid for user: ${user.email} (${user._id})`);
    // Issue new access token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '1h' }
    );
    // Rotate refresh token
    const newRefresh = generateRefreshToken();
    user.refreshToken = newRefresh;
    await user.save();
    const sanitized = { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, travelStyle: user.travelStyle, avgBudget: user.avgBudget || null, tags: user.tags || [], recentDestinations: user.recentDestinations || [] };
    res.json({ token, refreshToken: newRefresh, user: sanitized });
  } catch (err) {
    console.error('Error refreshing token:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

console.log("JWT_SECRET in use:", process.env.JWT_SECRET);

// Catch-all for unknown API routes
// This should be added in your main app.js or server.js, not in the controller.
// But for reference, here is the code to add:
// app.use('/api/*', (req, res) => {
//   res.status(404).json({ message: 'API endpoint not found' });
// });
// app.use((err, req, res, next) => {
//   console.error('Unhandled error:', err);
//   res.status(500).json({ message: 'Internal server error' });
// });

module.exports = { signup, login, refresh };