const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Itinerary = require('../models/Itinerary');
const Trip = require('../models/Trip');
const sendNotification = require('../utils/notify');

exports.createPost = async (req, res) => {
  const { content, images, taggedUsers, bindItinerary, bindTrip } = req.body;
  const userId = req.user.userId;

  if (!content && !bindItinerary && !bindTrip) {
    return res.status(400).json({ message: 'Post must contain text, itineraries, or trips' });
  }

  try {
    const post = await Post.create({
      userId,
      content,
      bindItinerary,
      taggedUsers: Array.isArray(taggedUsers) ? taggedUsers : [],
      images: Array.isArray(images) ? images : [],
      bindTrip,
    });

    if (bindItinerary) {
      await Itinerary.findByIdAndUpdate(bindItinerary, {
        $addToSet: { repostCount: userId }
      });
    }

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
            recipient: taggedId,
            sender: userId,
            type: 'custom',
            text: `${me.firstName} tagged you in a post.`,
            entityType: 'Post',
            entityId: post._id,
            link: `/post/${post._id}`
          });
        }
      }));
    }

    res.status(201).json({ message: 'Post created successfully', post });
  } catch (err) {
    console.error('createPost error:', err);
    res.status(500).json({ message: 'Failed to create post', error: err.message });
  }
};

exports.getUserPosts = async (req, res) => {
  const userId = req.user.userId;

  try {
    const posts = await Post.find({ userId })
      .populate('userId', 'firstName lastName profilePicture')
      .populate('taggedUsers', '_id firstName lastName profilePicture')
      .populate({
        path: 'bindItinerary',
        populate: { path: 'createdBy', select: 'firstName lastName profilePicture' }
      })
      .populate({
        path: 'bindTrip',
        populate: { path: 'userId', select: 'firstName lastName profilePicture' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    console.error('getUserPosts error:', err);
    res.status(500).json({ message: 'Failed to fetch posts', error: err.message });
  }
};

exports.getFeedPosts = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    const userAndFollowings = [currentUserId, ...currentUser.followings];

    const posts = await Post.find({ userId: { $in: userAndFollowings } })
      .populate('userId', 'firstName lastName profilePicture')
      .populate('taggedUsers', '_id firstName lastName profilePicture')
      .populate({
        path: 'bindItinerary',
        populate: { path: 'createdBy', select: 'firstName lastName profilePicture' }
      })
      .populate({
        path: 'bindTrip',
        populate: { path: 'userId', select: 'firstName lastName profilePicture' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    console.error('getFeedPosts error:', err);
    res.status(500).json({ message: 'Failed to load feed', error: err.message });
  }
};

exports.getPostsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const posts = await Post.find({ userId })
      .populate('userId', 'firstName lastName profilePicture')
      .populate('taggedUsers', '_id firstName lastName profilePicture')
      .populate({
        path: 'bindItinerary',
        populate: { path: 'createdBy', select: 'firstName lastName profilePicture' }
      })
      .populate({
        path: 'bindTrip',
        populate: { path: 'userId', select: 'firstName lastName profilePicture' } // Changed from 'createdBy' to 'userId'
      })
      .sort({ createdAt: -1 })
      .setOptions({ strictPopulate: false }); // Add this to prevent errors

    res.status(200).json(posts);
  } catch (err) {
    console.error('getPostsByUserId error:', err);
    res.status(500).json({ message: 'Failed to fetch user posts', error: err.message });
  }
};

exports.addComment = async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;
  const userId = req.user.userId;
  try {
    const comment = new Comment({
      userId,
      content: text,
      targetId: postId,
      targetModel: 'Post',
    });
    await comment.save();

    await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

    // Notify post author
    const me = await User.findById(userId).select('firstName');
    const post = await Post.findById(postId).select('userId');
    if (post && post.userId.toString() !== userId) {
      await sendNotification({
        recipient: post.userId,
        sender: userId,
        type: 'comment',
        text: `${me.firstName} commented on your post.`,
        entityType: 'Post',
        entityId: post._id,
        link: `/post/${postId}`
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ message: 'Failed to add comment', error: err.message });
  }
};

exports.deleteComment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.userId;

    session.startTransaction();

    const comment = await Comment.findById(commentId).session(session);
    if (!comment) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.userId.toString() !== userId) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    if (comment.targetModel === 'Post' && comment.targetId.toString() !== postId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Comment does not belong to specified post' });
    }

    if (comment.targetModel === 'Post') {
      await Post.findByIdAndUpdate(
        comment.targetId,
        { $pull: { comments: comment._id } },
        { session }
      );
    } else if (comment.targetModel === 'Trip') {
      await Trip.findByIdAndUpdate(
        comment.targetId,
        { $pull: { comments: comment._id } },
        { session }
      );
    }

    await Comment.deleteOne({ _id: commentId }).session(session);

    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    await session.abortTransaction();
    console.error('deleteComment error:', err);
    res.status(500).json({ message: 'Failed to delete comment', error: err.message });
  } finally {
    session.endSession();
  }
};

exports.getCommentsForPost = async (req, res) => {
  const { postId } = req.params;
  try {
    const comments = await Comment.find({
      targetId: postId,
      targetModel: 'Post',
    }).populate('userId', 'firstName lastName profilePicture');
    res.json(comments);
  } catch (err) {
    console.error('getCommentsForPost error:', err);
    res.status(500).json({ message: 'Failed to retrieve comments', error: err.message });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('userId', 'firstName lastName profilePicture')
      .populate('taggedUsers', '_id firstName lastName profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'userId', select: 'firstName lastName profilePicture' }
      });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error('getPostById error:', err);
    res.status(500).json({ message: 'Failed to fetch post', error: err.message });
  }
};

exports.deletePost = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    session.startTransaction();

    const post = await Post.findById(postId).session(session);
    if (!post) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.userId.toString() !== userId) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    // Delete comments tied to this post
    await Comment.deleteMany({ targetModel: 'Post', targetId: post._id }).session(session);

    // Remove from bound trip/itinerary
    if (post.bindTrip) {
      await Trip.findByIdAndUpdate(post.bindTrip, { $pull: { posts: post._id } }, { session });
    }
    if (post.bindItinerary) {
      await Itinerary.findByIdAndUpdate(post.bindItinerary, { $pull: { posts: post._id } }, { session });
    }

    // Hard delete the post
    await Post.deleteOne({ _id: postId }).session(session);

    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Post deleted successfully (hard-deleted)' });
  } catch (err) {
    await session.abortTransaction();
    console.error('deletePost error:', err);
    res.status(500).json({ message: 'Failed to delete post', error: err.message });
  } finally {
    session.endSession();
  }
};

