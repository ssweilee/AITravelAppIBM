const Post = require('../models/Post');
const User = require('../models/User');

exports.createPost = async (req, res) => {
  const { content } = req.body;
  const userId = req.user.userId;

  console.log("Authenticated user:", req.user);
  console.log("Post content:", req.body.content);

  if (!content) {
      return res.status(400).json({ message: 'Post content is required' });
    }

  try {
    const post = await Post.create({ userId, content });
    res.status(201).json({ message: 'Post created succesfully', post });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create post', error: err.message });
  }
};

exports.getUserPosts = async (req, res) => {
  const userId = req.user.userId;

  try {
    const posts = await Post.find({ userId })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts', error: err.message });
  }
};

exports.getFeedPosts = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userAndFollowings = [currentUserId, ...currentUser.followings];

    const posts = await Post.find({ userId: { $in: userAndFollowings } })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load feed', error: err.message });
  }
};

exports.getPostsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const posts = await Post.find({ userId })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user posts', error: err.message });
  }
}