const mongoose = require('mongoose');
const Itinerary = require('../models/Itinerary');
const Post = require('../models/Post');

exports.createItinerary = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      title,
      description,
      destination,
      startDate,
      endDate,
      days,
      isPublic,
      tags,
      coverImage,
    } = req.body;

    if (
      !title ||
      !destination ||
      !startDate ||
      !endDate ||
      !Array.isArray(days) ||
      days.length === 0
    ) {
      return res
        .status(400)
        .json({ message: 'Required field are missing or invalid' });
    }

    const newItinerary = new Itinerary({
      title,
      description,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days,
      createdBy: userId,
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
      tags: Array.isArray(tags) ? tags : [],
      coverImage: coverImage || '',
    });

    const savedItinerary = await newItinerary.save();
    res.status(201).json({
      message: 'Itinerary created successfully',
      itinerary: savedItinerary,
    });
  } catch (error) {
    console.error('Error creating itinerary:', error);
    res.status(500).json({
      message: 'Failed to create itinerary',
      error: error.message,
    });
  }
};

exports.getUserItineraries = async (req, res) => {
  try {
    const userId = req.user.userId;

    const itineraries = await Itinerary.find({
      createdBy: userId,

    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName profilePicture');

    res.status(200).json(itineraries);
  } catch (error) {
    console.error('Error fetching user itineraries:', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch itineraries', error: error.message });
  }
};

exports.getItinerariesByUserId = async (req, res) => {
  try {
    const paramId = req.params.id;
    const requesterId = req.user.userId;
    console.log(
      '[getItinerariesByUserId] paramId:',
      paramId,
      'requesterId:',
      requesterId
    );

    const filter = { createdBy: paramId };
    const itineraries = await Itinerary.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName profilePicture');

    res.status(200).json(itineraries);
  } catch (error) {
    console.error('Error fetching itineraries by user:', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch itineraries', error: error.message });
  }
};

exports.deleteItinerary = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { itineraryId } = req.params;
    const userId = req.user.userId;

    session.startTransaction();

    const itin = await Itinerary.findById(itineraryId).session(session);
    if (!itin) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Itinerary not found' });
    }

    if (itin.createdBy.toString() !== userId) {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ message: 'You can only delete your own itineraries' });
    }

    // Hard delete the itinerary
    await Itinerary.deleteOne({ _id: itineraryId }).session(session);

    // Clean up any posts that referenced this itinerary
    await Post.updateMany(
      { bindItinerary: itineraryId },
      { $unset: { bindItinerary: '' } },
      { session }
    );

    await session.commitTransaction();
    res
      .status(200)
      .json({ success: true, message: 'Itinerary deleted successfully (hard-deleted)' });
  } catch (err) {
    await session.abortTransaction();
    console.error('deleteItinerary error:', err);
    res
      .status(500)
      .json({ message: 'Failed to delete itinerary', error: err.message });
  } finally {
    session.endSession();
  }
};

exports.getItineraryById = async (req, res) => {
  try {
    const { itineraryId } = req.params;

    const itinerary = await Itinerary.findById(itineraryId)
      .populate('createdBy', 'firstName lastName profilePicture')
      .populate({
        path: 'days',
        populate: {
          path: 'activities',
        },
      });
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    res.status(200).json(itinerary);
  } catch (error) {
    console.error('getItineraryById error:', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch itinerary', error: error.message });
  }
};

