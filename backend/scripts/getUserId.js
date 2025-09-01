const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const user = await User.findOne();
    console.log('User ID:', user._id.toString());
    mongoose.disconnect();
  });