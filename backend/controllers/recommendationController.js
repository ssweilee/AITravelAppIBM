const Trip = require('../models/Trip');
const User = require('../models/User');

exports.buildUserPreferenceProfile = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId)
      .populate('savedTrips')
      .populate({
        path: 'trips',
        populate: { path: 'posts' }
      })
      .populate('followings');

    if (!user) {
      throw new Error('User not found');
    }

    // find all trips liked by the user and store trip IDs in 'likedTripsIds'
    const likedTrips = await Trip.find({ likes: user._id }, '_id');
    const likedTripsIds = likedTrips.map(trip => trip._id.toString());

    const preferenceProfile = {
      userId: user._id.toString(),
      travelStyle: user.travelStyle || null,
      location: user.location || null,
      followings: user.followings.map(f => f._id.toString()),
      savedTripsIds: [...user.savedTrips.map(st => st._id.toString())],
      likedTripsIds: likedTripsIds,
      avgBudget: null,
      recentDestinations: {},
      tags: {},
    };

    const recentTrips = [...user.trips];
    const budgets = [];
    const destinations = {};
    const tagCounts = {};
  

    for (const trip of recentTrips) {
      // tags aggregation
      if (Array.isArray(trip.tags)) {
        for (const tag of trip.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }

      // destination aggregation
      if (trip.destination) {
        destinations[trip.destination] = (destinations[trip.destination] || 0) + 1;
      }

      // budget aggregation 
      if (trip.budget) budgets.push(trip.budget);
    }

    // find median budget
    if (budgets.length > 0) {
      const sorted = budgets.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      preferenceProfile.avgBudget =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
    }
 
    preferenceProfile.recentDestinations = destinations;
    preferenceProfile.tags = tagCounts;
    res.status(200).json(preferenceProfile);
    
  } catch (error) {
    console.log('Failed to build user preference profile: ', error.message);
    throw error;
  }
};