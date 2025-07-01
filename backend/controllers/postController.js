const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Itinerary = require('../models/Itinerary');

exports.createPost = async (req, res) => {
  const { content, images, taggedUsers, bindItinerary} = req.body;
  const userId = req.user.userId;

  console.log("Authenticated user:", req.user);
  console.log("Post content:", req.body.content);
  console.log("Images:", images);
  console.log("Tagged Users:", taggedUsers);

  if (!content && !bindItinerary) {
    return res.status(400).json({ message: 'Post must contain text or itineraries' });
  }

  console.log('Parsed bindItinerary:', req.body.bindItinerary);

  try {
    const post = await Post.create({ userId, content, bindItinerary, taggedUsers: taggedUsers || [], images: Array.isArray(images) ? images : [] });

    if (bindItinerary) {
    // Push user to 'repostedBy' array only if not already included
      await Itinerary.findByIdAndUpdate(bindItinerary, {
        $addToSet: { repostCount: userId } // avoids duplicates
      });
    }

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
      .populate({
        path: 'bindItinerary',
        populate: { path: 'createdBy', select: 'firstName lastName'}
      })
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
       .populate({
        path: 'bindItinerary',
        populate: { path: 'createdBy', select: 'firstName lastName'}
      })
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
      .populate('bindItinerary')
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user posts', error: err.message });
  }
}

/*exports.toggleLikePost = async (req, res) => {
  const postId = req.params.postId;        
  const userId = req.user.userId;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const liked = post.likes.includes(userId);
    if (liked) {
      post.likes = post.likes.filter(u => u.toString() !== userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();

    return res.json({
      liked: !liked,
      likesCount: post.likes.length,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to toggle like', error: err.message });
  }
};
*/
exports.addComment = async (req, res) => {
  const {postId} = req.params;
  const {text} = req.body;
  const userId = req.user.userId;
  try{
    const comment =new Comment({
      userId,
      content:text,
      targetId:postId,
      targetModel:'Post',
});
    await comment.save();
    const post = await Post.findById(postId);
    post.comments.push(comment._id);
    await post.save();
    res.status(201).json(comment);
  }catch(err){
    res.status(500).json({ message: 'Failed to add comment', error: err.message });
  }
};
exports.getCommentsForPost = async (req, res) => {
  const { postId } = req.params;

  try {
    const comments = await Comment.find({
      targetId: postId,
      targetModel: 'Post',
    }).populate('userId', 'firstName lastName');

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve comments', error: err.message });
  }
};