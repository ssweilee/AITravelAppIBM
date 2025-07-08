const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Itinerary = require('../models/Itinerary');
const Trip = require('../models/Trip'); // Add this import
const sendNotification = require('../utils/notify');

exports.createPost = async (req, res) => {
  const { content, images, taggedUsers, bindItinerary, bindTrip} = req.body; // Add bindTrip
  const userId = req.user.userId;

  console.log("Authenticated user:", req.user);
  console.log("Post content:", req.body.content);
  console.log("Images:", images);
  console.log("Tagged Users:", taggedUsers);

  if (!content && !bindItinerary && !bindTrip) {
    return res.status(400).json({ message: 'Post must contain text, itineraries, or trips' });
  }

  console.log('Parsed bindItinerary:', req.body.bindItinerary);
  console.log('Parsed bindTrip:', req.body.bindTrip); // Add logging

  try {
    const post = await Post.create({ userId, content, bindItinerary, taggedUsers: taggedUsers || [], images: Array.isArray(images) ? images : [], bindTrip }); // Add bindTrip

    // Handle itinerary repost count
    if (bindItinerary) {
      await Itinerary.findByIdAndUpdate(bindItinerary, {
        $addToSet: { repostCount: userId }
      });
    }

    // Handle trip repost count
    if (bindTrip) {
      await Trip.findByIdAndUpdate(bindTrip, {
        $addToSet: { repostCount: userId }
      });
    }
    
        // Notify tagged users
    const tags = Array.isArray(taggedUsers) ? taggedUsers : [];
    if (tags.length > 0) {
      const me = await User.findById(userId).select('firstName');
      await Promise.all(tags.map(async taggedId => {
        if (taggedId.toString() !== userId) {
          await sendNotification({
            recipient:   taggedId,
            sender:      userId,
            type:        'custom',
            text:        `${me.firstName} tagged you in a post.`,
            entityType:  'Post',
            entityId:    post._id,
            link:        `/post/${post._id}`
          });
        }
      }));
    }

    res.status(201).json({ message: 'Post created successfully', post });

  } catch (err) {
    res.status(500).json({ message: 'Failed to create post', error: err.message });
  }
};

exports.getUserPosts = async (req, res) => {
  const userId = req.user.userId;

  try {
    const posts = await Post.find({ userId })
      .populate('userId', 'firstName lastName profilePicture')
      .populate({
        path: 'bindItinerary',
        populate: { path: 'createdBy', select: 'firstName lastName profilePicture'}
      })
      .populate({
        path: 'bindTrip', // Add trip population
        populate: { path: 'userId', select: 'firstName lastName profilePicture'}
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

      .populate('userId', 'firstName lastName profilePicture')
       .populate({

        path: 'bindItinerary',
        populate: { path: 'createdBy', select: 'firstName lastName profilePicture'}
      })
      .populate({
        path: 'bindTrip', // Add trip population
        populate: { path: 'userId', select: 'firstName lastName profilePicture'}
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

      .populate('userId', 'firstName lastName profilePicture')
      .populate({
        path: 'bindItinerary',
        populate: { path: 'createdBy', select: 'firstName lastName profilePicture'} // Added profilePicture
      })
     .populate({
       path:'bindTrip',
       populate:{path:'createdBy',select: 'firstName lastName profilePicture'}
     })

      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user posts', error: err.message });
  }
}

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

    // Notify post author
    const me = await User.findById(userId).select('firstName');
    
    if(post.userId.toString() !== userId) {
      await sendNotification({
        recipient: post.userId,
        sender: userId,
        type: 'comment',
        text: `${me.firstName} commented on your post.`,
        entityType: 'Post',
        entityId: post._id,
        link: `/post/${postId}` // Link to the post
      });
    }

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

// GET /api/posts/:postId
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('userId', 'firstName lastName profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'userId', select: 'firstName lastName' }
      });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error('Failed to fetch post:', err);
    res.status(500).json({ message: 'Failed to fetch post', error: err.message });
  }
};
