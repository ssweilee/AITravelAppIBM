const User = require('../models/User');
const Post = require('../models/Post');
const Itinerary = require('../models/Itinerary');
const Trip = require('../models/Trip');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_Q_LEN = 64;
const AUTHOR_ID_CAP = 200;

const toPosInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.searchUsers = async (req, res) => {
  const raw = (req.query.q || '').trim();
  const query = raw.slice(0, MAX_Q_LEN);
  const page = toPosInt(req.query.page, 1);
  const limit = Math.min(toPosInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const regex = new RegExp(escapeRegex(query), 'i');

    const users = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }]
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
  const raw = (req.query.q || '').trim();
  const query = raw.slice(0, MAX_Q_LEN);
  const page = toPosInt(req.query.page, 1);
  const limit = Math.min(toPosInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const regex = new RegExp(escapeRegex(query), 'i');

    const matchingUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }]
    })
      .select('_id')
      .limit(AUTHOR_ID_CAP)
      .lean();

    const userIds = matchingUsers.map((u) => u._id);

    const orClauses = [{ content: { $regex: regex } }];
    if (userIds.length) orClauses.push({ userId: { $in: userIds } });

    const posts = await Post.find({ $or: orClauses })
      .populate('userId', 'firstName lastName profilePicture')
      .select('content createdAt userId images likes savedBy repostCount')
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
  const raw = (req.query.q || '').trim();
  const query = raw.slice(0, MAX_Q_LEN);
  const page = toPosInt(req.query.page, 1);
  const limit = Math.min(toPosInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = (page - 1) * limit;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const regex = new RegExp(escapeRegex(query), 'i');

    const matchingUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }]
    })
      .select('_id')
      .limit(AUTHOR_ID_CAP)
      .lean();

    const userIds = matchingUsers.map((u) => u._id);

    const orClauses = [{ title: regex }];
    if (userIds.length) orClauses.push({ createdBy: { $in: userIds } });

    const itins = await Itinerary.find({ $or: orClauses })
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

exports.searchTrips = async (req, res) => {
  const raw   = (req.query.q || '').trim();
  const query = raw.slice(0, MAX_Q_LEN);
  const page  = toPosInt(req.query.page, 1);
  const limit = Math.min(toPosInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip  = (page - 1) * limit;

  if (!query) return res.status(400).json({ message: 'Search query is required' });

  try {
    const regex = new RegExp(escapeRegex(query), 'i');

    const matchingUsers = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }]
    })
      .select('_id')
      .limit(AUTHOR_ID_CAP)
      .lean();

    const userIds = matchingUsers.map(u => u._id);

    const orClauses = [
      { title: regex },
      { destination: regex },
      { location: regex },
      { city: regex },
      { country: regex },
      { description: regex },

      // common nested shapes — safe to include even if not present
      { 'destinations.city': regex },
      { 'destinations.country': regex },
      { 'stops.city': regex },
      { 'stops.country': regex },
      { 'places.name': regex },
      { 'places.city': regex },
      { 'places.country': regex },
    ];

    if (userIds.length) {
      orClauses.push({ createdBy: { $in: userIds } });
      orClauses.push({ userId:    { $in: userIds } }); // alt schema
      orClauses.push({ owner:     { $in: userIds } }); // alt schema
    }

    const trips = await Trip.find({ $or: orClauses })
      .populate('userId', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ page, limit, results: trips });
  } catch (err) {
    console.error('Trip search failed:', err);
    res.status(500).json({ message: 'Trip search failed', error: err.message });
  }
};




