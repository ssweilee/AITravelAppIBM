const Trip = require('../models/Trip');
const User = require('../models/User');
const Post = require('../models/Post');
const Itinerary = require('../models/Itinerary');
const Comment = require('../models/Comment');

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

    // Populate the response (no likes population)
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
      // REMOVED: .populate('likes', 'firstName lastName') - This was causing the issue
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
      // REMOVED: .populate('likes', 'firstName lastName') - This was causing the issue
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
      // REMOVED: .populate('likes', 'firstName lastName') - This was causing the issue
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
      // REMOVED: .populate('likes', 'firstName lastName') - This was causing the issue
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

    // Find the trip and verify ownership
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.userId.toString() !== userId) {
      return res.status(403).json({ message: 'You can only edit your own trips' });
    }

    // Validate dates if provided
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Verify posts ownership if provided
    if (selectedPosts && selectedPosts.length > 0) {
      const userPosts = await Post.find({ _id: { $in: selectedPosts }, userId });
      if (userPosts.length !== selectedPosts.length) {
        return res.status(403).json({ message: 'You can only add your own posts to a trip' });
      }
    }

    // Update the trip
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
  try {
    const { tripId } = req.params;
    const userId = req.user.userId;

    // Find the trip and verify ownership
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.userId.toString() !== userId) {
      return res.status(403).json({ message: 'You can only delete your own trips' });
    }

    // Remove trip from user's trips array
    await User.findByIdAndUpdate(userId, {
      $pull: { trips: tripId }
    });

    // Delete the trip
    await Trip.findByIdAndDelete(tripId);

    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ message: 'Failed to delete trip', error: error.message });
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
    trip.comments.push(comment._id);
    await trip.save();
    
    res.status(201).json(comment);
  } catch (err) {
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