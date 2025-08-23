// backend/models/ChatSession.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['system','user','assistant'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
},{ _id:false });

const ScratchpadSchema = new mongoose.Schema({
  destinations: [{ name: String, region: String }],
  interests: [String],
  constraints: {
    budgetLevel: String,
    pace: String,
    travelers: Number,
    dates: { start: String, end: String },
    homeAirport: String
  },
  shortNotes: String
},{ _id:false });

const ChatSessionSchema = new mongoose.Schema({
  // IMPORTANT: ObjectId to match your previous working version.
  userId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
  title: { type: String, default: 'Travel chat' },
  messages: { type: [MessageSchema], default: [] },
  summary: { type: String, default: '' },
  scratchpad: { type: ScratchpadSchema, default: () => ({}) },
  archived: { type: Boolean, default: false },
}, { timestamps: true });

ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
