// models/Notification.js
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
    type: String, // e.g. 'Post', 'Comment', 'Itinerary'
    enum: ['Post', 'Comment', 'Itinerary', 'Custom'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId, // ID of the entity (e.g. Post, Comment, Itinerary)
    required: true
  },
  link: {
    type: String, // optional URL or in-app route (e.g. `/post/123`)
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

