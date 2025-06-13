const User = require('../models/User');
const Post = require('../models/Post');

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

