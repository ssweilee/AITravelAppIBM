const Trip    = require('../models/Trip');
const Comment = require('../models/Comment');


exports.createTrip = async (req, res) => {
  try {
    const {
      title,
      destination,
      coverImage,
      startDate,
      endDate,
      description,
      budget,
      isPublic,
      posts = [],
      itineraries = []
    } = req.body;

    const trip = new Trip({
      userId: req.user.userId,
      title,
      destination,
      coverImage,
      startDate,
      endDate,
      description,
      budget,
      isPublic,
      posts,
      itineraries
    });

    const createdTrip = await trip.save();
    res.status(201).json(createdTrip);
  } catch (error) {
    console.error('Error in createTrip:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      $or: [
        { userId: req.user.userId },
        { isPublic: true }
      ]
    });
    res.json(trips);
  } catch (error) {
    console.error('Error in getTrips:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('posts', 'content _id')
      //.populate('itineraries', 'title date _id');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (!trip.isPublic && !trip.userId.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(trip);
  } catch (error) {
    console.error('Error in getTripById:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (!trip.userId.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    
    const updatable = ['title','destination','coverImage','startDate','endDate','description','budget','isPublic'];
    updatable.forEach(field => {
      if (req.body[field] !== undefined) {
        trip[field] = req.body[field];
      }
    });

    const updatedTrip = await trip.save();
    res.json(updatedTrip);
  } catch (error) {
    console.error('Error in updateTrip:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (!trip.userId.equals(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await trip.remove();
    res.json({ message: 'Trip removed' });
  } catch (error) {
    console.error('Error in deleteTrip:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addCommentToTrip = async (req, res) => {
  try {
    const { text } = req.body;
    const userId   = req.user.userId;
    const tripId   = req.params.id;

    const comment = new Comment({
      userId,
      content:     text,
      targetId:    tripId,
      targetModel: 'Trip'
    });
    await comment.save();

    const trip = await Trip.findById(tripId);
    trip.comments.push(comment._id);
    await trip.save();

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error in addCommentToTrip:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCommentsForTrip = async (req, res) => {
  try {
    const tripId  = req.params.id;
    const comments = await Comment
      .find({ targetId: tripId, targetModel: 'Trip' })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    console.error('Error in getCommentsForTrip:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


