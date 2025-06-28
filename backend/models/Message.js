const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    require: true
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
  type: {
    type: String,
    enum: ['text','share'],
    default: 'text'
  },
  sharedContent: {
    contentType: {
      type: String,
      enum: ['Post','Trip','Itinerary']
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sharedContent.contentType'
    }
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