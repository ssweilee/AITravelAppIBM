const Trip = require('../models/Trip');
const User = require('../models/User');

exports.buildUserPreferenceProfile = async (userId) => {
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

    const preferenceProfile = {
      userId: user._id.toString(),
      travelStyle: user.travelStyle || null,
      location: user.location || null,
      followings: user.followings.map(f => f._id.toString()),
      savedTripsIds: [...user.savedTrips.map(st => st._id.toString())],
      likedTripsIds: [],
      avgBudget: null,
      recentDestinations: []
    };

    const recentTrips = [...user.trips];
   
    const budgets = [];
    const destinations = {};

    for (const trip of recentTrips) {
      //preferenceProfile.savedTripsIds.push(trip._id.toString());

      // budget aggregation 
      if (trip.budget) budgets.push(trip.budget);

      // destination aggregation
      if (trip.destination) {
        destinations[trip.destination] = (destinations[trip.destination] || 0) + 1;
      }
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

    const sortedDestinations = Object.entries(destinations)
      .sort((a, b) => b[1] - a[1])
      .map(([dest]) => dest);
    preferenceProfile.recentDestinations = sortedDestinations;

    return preferenceProfile;

  } catch (error) {
    console.log('Failed to build user preference profile: ', error.message);
    throw error;
  }
};