const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  bindItinerary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Itinerary',
    default: null
  },
  bindTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    default: null
  },
  likes:[{
    type:mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  taggedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  /*taggedPeople: {

  },*/
  /*location: {

  },*/
  images: [{
    url: {
      type: String,
      required: true 
    },
    caption: {
      type: String,
      default: ''
    }    
  }]
  /*bindInterary: {
    
  }*/
});

module.exports = mongoose.model('Post', postSchema);