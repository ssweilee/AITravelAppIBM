const Itinerary = require('../models/Itinerary');

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
      coverImage
    } = req.body;

    if ( !title || !destination || !startDate || !endDate || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ message: 'Required field are missing or invalid' });
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
      itinerary: savedItinerary 
    });
  } catch (error) {
    console.error('Error creating itinerary:', error);
    res.status(500).json({ 
      message: 'Failed to create itinerary', 
      error: error.message 
    });
  }
}

exports.getUserItineraries = async (req, res) => {
  try {
    const userId = req.user.userId;

    const itineraries = await Itinerary.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName profilePicture');
    
    res.status(200).json(itineraries);
  } catch (error) {
    console.error('Error fetching user itineraries:', error);
    res.status(500).json({ message: 'Failed to fetch itineraries', error: error.message });
  }
};

exports.getItinerariesByUserId = async (req, res) => {
  try {
    const userId = req.params.id;

    const itineraries = await Itinerary.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName profilePicture');

    res.status(200).json(itineraries);
  } catch (error) {
    console.error('Error fetching itineraries by user:', error);
    res.status(500).json({ message: 'Failed to fetch itineraries', error: error.message });
  }
};