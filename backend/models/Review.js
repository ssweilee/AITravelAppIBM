const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({ 
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel',
    required: True
  },
  targetModel: {
    type: String,
    required: true,
    enum: ['Hotel', 'Restaurant', 'Attraction'] // Specify the models that can be targeted
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  reting: {
    type: Number,
    required: true,
    min: 1,
    max: 5 // Assuming a rating scale of 1 to 5
  },
  wouldRecommend: {
    type: Boolean,
    default: false // Default to not recommending
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Review', reviewSchema);