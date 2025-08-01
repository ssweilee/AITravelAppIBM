require('dotenv').config();
const mongoose = require('mongoose');
const { buildUserPreferenceProfile } = require('../controllers/recommendationController');

require('../models/Trip');
require('../models/User');
require('../models/Post');

const testUserId = '684ca2dda83eb2d0a9c2cd7c'; // your actual user._id here

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const profile = await buildUserPreferenceProfile(testUserId);
    console.log('User Preference Profile:', JSON.stringify(profile, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error testing preference profile:', err);
    process.exit(1);
  }
}

test();