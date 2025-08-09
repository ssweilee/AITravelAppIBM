// controllers/searchController.js

const User      = require('../models/User');
const Post      = require('../models/Post');
const Itinerary = require('../models/Itinerary');
const DEFAULT_LIMIT = 20;

exports.searchUsers = async (req, res) => {
  const query = req.query.q?.trim();
  const page  = parseInt(req.query.page, 10)  || 1;
  const limit = parseInt(req.query.limit, 10) || DEFAULT_LIMIT;
  const skip  = (page - 1) * limit;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName:  { $regex: query, $options: 'i' } },
      ]
    })
    .select('firstName lastName profilePicture location followers trips')
    .populate('followers', '_id')
    .limit(limit)
    .skip(skip)
    .lean();

    res.json({ page, limit, results: users });
  } catch (err) {
    console.error('User search failed:', err);
    res.status(500).json({ message: 'User search failed', error: err.message });
  }
};

exports.searchPosts = async (req, res) => {
  const query = req.query.q?.trim();
  const page  = parseInt(req.query.page, 10)  || 1;
  const limit = parseInt(req.query.limit, 10) || DEFAULT_LIMIT;
  const skip  = (page - 1) * limit;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const regex = new RegExp(query, 'i');

    // first find any users whose name matches
    const matchingUsers = await User.find({
      $or: [
        { firstName: regex },
        { lastName:  regex }
      ]
    }).select('_id');

    const userIds = matchingUsers.map(u => u._id);

    // then find posts by content OR by those userIds
    const posts = await Post.find({
      $or: [
        { content:  { $regex: regex } },
        { userId:   { $in: userIds } }
      ]
    })
    .populate('userId', 'firstName lastName profilePicture')
    .select('content createdAt userId images')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

    res.json({ page, limit, results: posts });
  } catch (err) {
    console.error('Post search failed:', err);
    res.status(500).json({ message: 'Post search failed', error: err.message });
  }
};

exports.searchItineraries = async (req, res) => {
  const query = req.query.q?.trim();
  const page  = parseInt(req.query.page, 10)  || 1;
  const limit = parseInt(req.query.limit, 10) || DEFAULT_LIMIT;
  const skip  = (page - 1) * limit;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const regex = new RegExp(query, 'i');

    // find users by name
    const matchingUsers = await User.find({
      $or: [
        { firstName: regex },
        { lastName:  regex }
      ]
    }).select('_id');

    const userIds = matchingUsers.map(u => u._id);

    // find itineraries by title OR by creator
    const itins = await Itinerary.find({
      $or: [
        { title:     regex },
        { createdBy: { $in: userIds } }
      ]
    })
    .populate('createdBy', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

    res.json({ page, limit, results: itins });
  } catch (err) {
    console.error('Itinerary search failed:', err);
    res.status(500).json({ message: 'Itinerary search failed', error: err.message });
  }
};



