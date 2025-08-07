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
    res.status(201).json({ message: 'Signup successful', userId: newUser.id });
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

    res.json({ message: 'Login successul', token, refreshToken });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Endpoint to refresh JWT using refresh token
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }
  try {
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    // Log when refresh token is used
    console.log(`Refresh token used for user: ${user.email} (${user._id})`);
    // Issue new JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '1h' }
    );
    res.json({ token });
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