const Trip = require('../models/Trip');
const User = require('../models/User');
const axios = require('axios');

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

exports.getPythonRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Fetch the latest user profile with all preference fields
    const user = await User.findById(userId)
      .populate('savedTrips')
      .populate({
        path: 'trips',
        populate: { path: 'posts' }
      })
      .populate('followings');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Show the user document being used for recommendations
    console.log('[getPythonRecommendations] user document:', JSON.stringify(user, null, 2));

    // Find all trips liked by the user and store trip IDs in 'likedTripsIds'
    const likedTrips = await Trip.find({ likes: user._id }, '_id');
    const likedTripsIds = likedTrips.map(trip => trip._id.toString());

    // --- Robustly convert tags and recentDestinations to object format if needed ---
    let tagsObj = {};
    if (Array.isArray(user.tags)) {
      for (const tag of user.tags) {
        if (tag) tagsObj[tag] = 1;
      }
    } else if (user.tags && typeof user.tags === 'object') {
      tagsObj = user.tags;
    }

    // Combine recentDestinations and favoriteDestinations for recommendations
    let destinationsArr = [];
    if (Array.isArray(user.recentDestinations)) destinationsArr = destinationsArr.concat(user.recentDestinations);
    if (Array.isArray(user.favoriteDestinations)) destinationsArr = destinationsArr.concat(user.favoriteDestinations);
    // Remove duplicates
    destinationsArr = [...new Set(destinationsArr)];
    let destinationsObj = {};
    for (const dest of destinationsArr) {
      if (dest) destinationsObj[dest] = 1;
    }

    // Build the up-to-date preference profile
    const preferenceProfile = {
      userId: user._id.toString(),
      travelStyle: user.travelStyle || null,
      location: user.location || null,
      followings: user.followings.map(f => f._id.toString()),
      savedTripsIds: Array.isArray(user.savedTrips) ? user.savedTrips.map(st => st._id.toString()) : [],
      likedTripsIds,
      avgBudget: typeof user.avgBudget === 'number' ? user.avgBudget : null,
      recentDestinations: destinationsObj,
      tags: tagsObj,
    };

    // Fallback: If user has no explicit avgBudget, tags, or recentDestinations, aggregate from trips
    if (!preferenceProfile.avgBudget || preferenceProfile.avgBudget === 0) {
      const budgets = user.trips && Array.isArray(user.trips)
        ? user.trips.filter(t => t.budget).map(t => t.budget)
        : [];
      if (budgets.length > 0) {
        const sorted = budgets.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        preferenceProfile.avgBudget =
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
      }
    }
    if (!preferenceProfile.tags || Object.keys(preferenceProfile.tags).length === 0) {
      // Aggregate tags from trips
      const tagCounts = {};
      if (user.trips && Array.isArray(user.trips)) {
        for (const trip of user.trips) {
          if (Array.isArray(trip.tags)) {
            for (const tag of trip.tags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          }
        }
      }
      preferenceProfile.tags = tagCounts;
    }
    if (!preferenceProfile.recentDestinations || Object.keys(preferenceProfile.recentDestinations).length === 0) {
      // Aggregate destinations from trips
      const destinations = {};
      if (user.trips && Array.isArray(user.trips)) {
        for (const trip of user.trips) {
          if (trip.destination) {
            destinations[trip.destination] = (destinations[trip.destination] || 0) + 1;
          }
        }
      }
      preferenceProfile.recentDestinations = destinations;
    }

    // Show the profile being sent to the recommender
    console.log('[getPythonRecommendations] Sending user preference profile:', JSON.stringify(preferenceProfile, null, 2));
    console.log('[getPythonRecommendations] Timestamp(ms):', Date.now());

    // Send the full profile to the Python recommender
    const response = await axios.post('http://127.0.0.1:5001/recommend', preferenceProfile);
    res.json(response.data);
  } catch (err) {
    console.error('Error calling Python recommender:', err.message);
    res.status(500).json({ error: 'Failed to get recommendations from Python service' });
  }
};