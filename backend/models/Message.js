const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  sharedItinerary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Itinerary',
    default: null
  },
  sharedTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    default: null
  },  
  sharedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
});

module.exports = mongoose.model('Message', messageSchema);