const Trip = require('../models/Trip');
const User = require('../models/User');
const Post = require('../models/Post');
const Itinerary = require('../models/Itinerary');
const Comment = require('../models/Comment');
const sendNotification = require('../utils/notify');

exports.createTrip = async (req, res) => {
  try {
    const { title, destination, description, budget, startDate, endDate, selectedPosts, selectedItineraries, tags } = req.body;
    const userId = req.user.userId;

    console.log('Tags: ', tags);

    // Validate required fields
    if (!title || !destination || !startDate || !endDate || !budget || !tags) {
      return res.status(400).json({ message: 'Title, destination, dates, tags, and budget are required' });
    }

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Verify that the user owns the selected posts and itineraries
    if (selectedPosts && selectedPosts.length > 0) {
      const userPosts = await Post.find({ _id: { $in: selectedPosts }, userId });
      if (userPosts.length !== selectedPosts.length) {
        return res.status(403).json({ message: 'You can only add your own posts to a trip' });
      }
    }

    if (selectedItineraries && selectedItineraries.length > 0) {
      const userItineraries = await Itinerary.find({ _id: { $in: selectedItineraries }, createdBy: userId });
      if (userItineraries.length !== selectedItineraries.length) {
        return res.status(403).json({ message: 'You can only add your own itineraries to a trip' });
      }
    }

    // Create the trip
    const trip = await Trip.create({
      userId,
      title,
      destination,
      description: description || '',
      tags: tags || [],
      budget,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      posts: selectedPosts || [],
    });

    // Add trip to user's trips array
    await User.findByIdAndUpdate(userId, {
      $push: { trips: trip._id }
    });

    // Populate the response
    const populatedTrip = await Trip.findById(trip._id)
      .populate('userId', 'firstName lastName')
      .populate('posts');

    res.status(201).json({
      message: 'Trip created successfully',
      trip: populatedTrip
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ message: 'Failed to create trip', error: error.message });
  }
};

exports.getUserTrips = async (req, res) => {
  try {
    const userId = req.user.userId;

    const trips = await Trip.find({ userId })
      .populate('userId', 'firstName lastName')
      .populate('posts')
      .populate('comments')
      .sort({ createdAt: -1 });

    res.status(200).json(trips);
  } catch (error) {
    console.error('Error fetching user trips:', error);
    res.status(500).json({ message: 'Failed to fetch trips', error: error.message });
  }
};

exports.getTripsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const trips = await Trip.find({ userId, isPublic: true })
      .populate('userId', 'firstName lastName')
      .populate('posts')
      .populate('comments')
      .sort({ createdAt: -1 });

    res.status(200).json(trips);
  } catch (error) {
    console.error('Error fetching user trips:', error);
    res.status(500).json({ message: 'Failed to fetch user trips', error: error.message });
  }
};

exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ isPublic: true })
      .populate('userId', 'firstName lastName')
      .populate('posts')
      .populate('comments')
      .sort({ createdAt: -1 });

    res.status(200).json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ message: 'Failed to fetch trips', error: error.message });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId)
      .populate('userId', 'firstName lastName')
      .populate('posts')
      .populate({
        path: 'comments',
        populate: {
          path: 'userId',
          select: 'firstName lastName'
        }
      });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.status(200).json(trip);
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ message: 'Failed to fetch trip', error: error.message });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;
    const { title, destination, description, tags, budget, startDate, endDate, selectedPosts, isPublic } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.userId.toString() !== userId) {
      return res.status(403).json({ message: 'You can only edit your own trips' });
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    if (selectedPosts && selectedPosts.length > 0) {
      const userPosts = await Post.find({ _id: { $in: selectedPosts }, userId });
      if (userPosts.length !== selectedPosts.length) {
        return res.status(403).json({ message: 'You can only add your own posts to a trip' });
      }
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (destination) updateData.destination = destination;
    if (description !== undefined) updateData.description = description;
    if (budget) updateData.budget = budget;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (selectedPosts) updateData.posts = selectedPosts;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (tags) updateData.tags = tags;

    const updatedTrip = await Trip.findByIdAndUpdate(tripId, updateData, { new: true })
      .populate('userId', 'firstName lastName')
      .populate('posts');

    res.status(200).json({
      message: 'Trip updated successfully',
      trip: updatedTrip
    });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ message: 'Failed to update trip', error: error.message });
  }
};

exports.deleteTrip = async (req, res) => {
  const session = await Trip.startSession();
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;

    session.startTransaction();

    const trip = await Trip.findById(tripId).session(session);
    if (!trip) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.userId.toString() !== userId) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You can only delete your own trips' });
    }

    // Delete comments tied to this trip
    await Comment.deleteMany({ targetModel: 'Trip', targetId: trip._id }).session(session);

    // Unset bindTrip on posts pointing to this trip (if that relationship exists)
    await Post.updateMany(
      { bindTrip: trip._id },
      { $unset: { bindTrip: '' } },
      { session }
    );

    // Remove trip from user's trip list
    await User.findByIdAndUpdate(
      userId,
      { $pull: { trips: tripId } },
      { session }
    );

    // Hard delete the trip
    await Trip.deleteOne({ _id: tripId }).session(session);

    await session.commitTransaction();
    res.status(200).json({ message: 'Trip deleted successfully (hard-deleted)' });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error deleting trip:', error);
    res.status(500).json({ message: 'Failed to delete trip', error: error.message });
  } finally {
    session.endSession();
  }
};

exports.addTripComment = async (req, res) => {
  const { tripId } = req.params;
  const { text } = req.body;
  const userId = req.user.userId;

  try {
    const comment = new Comment({
      userId,
      content: text,
      targetId: tripId,
      targetModel: 'Trip',
    });
    await comment.save();

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    trip.comments.push(comment._id);
    await trip.save();

    // Notify trip owner about the new comment (if not self)
    if (trip.userId.toString() !== userId) {
      const me = await User.findById(userId).select('firstName');
      await sendNotification({
        recipient: trip.userId,
        sender: userId,
        type: 'comment',
        text: `${me.firstName} commented on your trip.`,
        entityType: 'Trip',
        entityId: trip._id,
        link: `/trip/${tripId}`
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error('addTripComment error:', err);
    res.status(500).json({ message: 'Failed to add comment', error: err.message });
  }
};

exports.getTripComments = async (req, res) => {
  const { tripId } = req.params;

  try {
    const comments = await Comment.find({
      targetId: tripId,
      targetModel: 'Trip',
    }).populate('userId', 'firstName lastName');

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve comments', error: err.message });
  }
};

exports.deleteTripComment = async (req, res) => {
  const session = await Comment.startSession();
  try {
    const { tripId, commentId } = req.params;
    const userId = req.user.userId;

    session.startTransaction();

    const comment = await Comment.findById(commentId).session(session);
    if (!comment) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.targetModel !== 'Trip' || comment.targetId.toString() !== tripId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Comment does not belong to specified trip' });
    }

    if (comment.userId.toString() !== userId) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    // Remove reference from the trip
    await Trip.findByIdAndUpdate(
      tripId,
      { $pull: { comments: comment._id } },
      { session }
    );

    // Hard delete the comment
    await Comment.deleteOne({ _id: commentId }).session(session);

    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    await session.abortTransaction();
    console.error('deleteTripComment error:', err);
    res.status(500).json({ message: 'Failed to delete comment', error: err.message });
  } finally {
    session.endSession();
  }
};