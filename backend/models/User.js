const mongoose = require('mongoose');

const useSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique:true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String 
  },
  lastName: {
    type: String
  },
  dob: {
    type: Date
  },
  country: {
    type: String
  },
  travelStyle: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('User', useSchema);
// This code defines a Mongoose schema and model for a User entity.