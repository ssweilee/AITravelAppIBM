const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['follow','like','comment','itinerary','custom'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  entityType: {
    type: String, 
    enum: ['Post', 'Comment', 'Itinerary', 'Custom', 'Trip'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId, 
    required: true
  },
  link: {
    type: String, // optional URL or in-app route 
    default: ''
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);

