const User = require('../models/User');
const Post = require('../models/Post');
const DEFAULT_LIMIT = 20;
/*
exports.search = async (req, res) => {
  const query = req.query.q
  console.log(`${query}`);

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const userResults = await User.find({
      $or: [
      {firstName: {$regex: query, $options: 'i' } },
      { lastName: {$regex: query, $options: 'i' } },
      ]
    }).select('firstName lastName')

    const postResults = await Post.find({
      content: { $regex: query, $options: 'i' }
    }).populate('userId', 'firstName lastName');

    res.json({ users: userResults, posts: postResults });
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
};
*/

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
    .select('firstName lastName avatar')
    .limit(limit)
    .skip(skip);

    res.json({ page, limit, results: users });
  } catch (err) {
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
    const posts = await Post.find({
      content: { $regex: query, $options: 'i' }
    })
    .populate('userId', 'firstName lastName avatar')
    .select('content createdAt userId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    res.json({ page, limit, results: posts });
  } catch (err) {
    res.status(500).json({ message: 'Post search failed', error: err.message });
  }
};
