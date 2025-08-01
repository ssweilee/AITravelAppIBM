const Post = require('../models/Post');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');
const sendNotification = require('../utils/notify');

 function getModel(type) {
  switch (type) {
    case 'post':
      return Post;
    case 'trip':
      return Trip;
    case 'itinerary':
      return Itinerary;
      
    default:
      throw new Error('Invalid model type');
  }
}

exports.toggleLike = async (req, res) => {
  const { type, id } = req.params;        
  const userId       = req.user.userId;
  const Model        = getModel(type);
  const doc          = await Model.findById(id);
  if (!doc) return res.status(404).json({ message: `${type} not found` });

  // pick the right array field
  const arr = doc.likes;  
  const idx = arr.findIndex(u=>u.toString()===userId);
  if (idx >= 0) arr.splice(idx,1);
  else          arr.push(userId);

  if (doc.userId.toString() !== userId) {
    // send notification to the post owner if the user is not the owner
    const me = await User.findById(userId).select('firstName');
    await sendNotification({
      recipient: doc.userId,
      sender: userId,
      type: 'like',
      text: `${me.firstName} liked your ${type}.`,
      entityType: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize the type
      entityId: id,
      link: `/${type}/${id}` // Link to the post, trip, or itinerary
    });
  }

  await doc.save();
  res.json({ 
    liked: idx<0, 
    count: arr.length
  });
};

exports.toggleSave = async (req, res) => {
  const { type, id } = req.params;
  const userId = req.user.userId;
  
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let userArray;
    if (type === 'post') {
      userArray = user.savedPosts;
    } else if (type === 'itinerary') {
      userArray = user.savedItineraries;
    } else if (type === 'trip') {
      userArray = user.savedTrips;
    } else {
      return res.status(400).json({ message: 'Can only save posts, itineraries, or trips' });
    }

    const userIdx = userArray.findIndex(item => item.toString() === id);
    const isSaving = userIdx < 0; // true if we're saving, false if unsaving

    // Update User's saved array
    if (isSaving) {
      userArray.push(id);
    } else {
      userArray.splice(userIdx, 1);
    }
    await user.save();

    // For posts and trips, also update the document's savedBy array
    if (type === 'post') {
      const post = await Post.findById(id);
      if (post) {
        const postIdx = post.savedBy.findIndex(uid => uid.toString() === userId);
        
        if (isSaving && postIdx < 0) {
          // Add user to post's savedBy array
          post.savedBy.push(userId);
        } else if (!isSaving && postIdx >= 0) {
          // Remove user from post's savedBy array
          post.savedBy.splice(postIdx, 1);
        }
        await post.save();
      }
    } else if (type === 'trip') {
      const trip = await Trip.findById(id);
      if (trip) {
        const tripIdx = trip.savedBy.findIndex(uid => uid.toString() === userId);
        
        if (isSaving && tripIdx < 0) {
          // Add user to trip's savedBy array
          trip.savedBy.push(userId);
        } else if (!isSaving && tripIdx >= 0) {
          // Remove user from trip's savedBy array
          trip.savedBy.splice(tripIdx, 1);
        }
        await trip.save();
      }
    }
    
    res.json({ saved: isSaving, count: userArray.length });
  } catch (error) {
    console.error('Error toggling save:', error);
    res.status(500).json({ message: 'Error toggling save', error: error.message });
  }
};

exports.getSaved = async (req, res) => {
  const { type } = req.params;
  const userId = req.user.userId;

  // Define the populate path based on type
  let populatePath;
  if (type === 'post') {
    populatePath = {
      path: 'savedPosts',
      populate: [
        {
          path: 'userId',
          select: 'firstName lastName profilePicture'
        },
        {
          path: 'bindTrip', // Populate the bound trip
          populate: [
            {
              path: 'userId',
              select: 'firstName lastName profilePicture'
            },
            {
              path: 'posts', // Also populate posts within the bound trip
              populate: {
                path: 'userId',
                select: 'firstName lastName profilePicture'
              }
            },
            {
              path: 'likes',
              select: 'firstName lastName'
            },
            {
              path: 'comments',
              populate: {
                path: 'userId',
                select: 'firstName lastName'
              }
            }
          ]
        },
        {
          path: 'bindItinerary', // Also populate bound itineraries if any
          populate: {
            path: 'createdBy',
            select: 'firstName lastName profilePicture'
          }
        }
      ]
    };
  } else if (type === 'itinerary') {
    populatePath = {
      path: 'savedItineraries',
      populate: {
        path: 'userId',
        select: 'firstName lastName profilePicture'
      }
    };
  } else if (type === 'trip') {
    // THIS IS THE KEY FIX - populate posts within trips
    populatePath = {
      path: 'savedTrips',
      populate: [
        {
          path: 'userId',
          select: 'firstName lastName profilePicture'
        },
        {
          path: 'posts', // Populate the posts within trips
          populate: {
            path: 'userId',
            select: 'firstName lastName profilePicture'
          }
        },

        {
          path: 'comments',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        }
      ]
    };
  } else {
    return res.status(400).json({ message: 'Invalid type. Use post, itinerary, or trip' });
  }

  const user = await User.findById(userId).populate(populatePath);

  if (!user) {
    return res.status(404).json({ error: 'User not found', message: 'Failed to load user' });
  }

  // Pick the right field
  let data = type === 'post'
    ? user.savedPosts
    : type === 'itinerary' 
    ? user.savedItineraries
    : user.savedTrips;
    
  // Remove duplicates
  data = data.filter((item, idx, arr) =>
    arr.findIndex(i => i._id.toString() === item._id.toString()) === idx
  );

  res.json(data);
};

exports.addMention = async (req, res) => {
    const { type, id } = req.params;
    const userId       = req.user.userId;
    const Model        = getModel(type);
    const doc          = await Model.findById(id);
    if (!doc) return res.status(404).json({ message: `${type} not found` });
    if (!doc.taggedUsers.includes(userId)) {
      doc.taggedUsers.push(userId);
      await doc.save();

      // send notification to the user
      if (doc.userId.toString() !== userId) {
        const me = await User.findById(userId).select('firstName');
        // Notify the user who is being mentioned
        await sendNotification({
          recipient: doc.userId,
          sender: userId,
          type: 'custom',
          text: `${me.firstName} mentioned you in a ${type}.`,
          entityType: type.charAt(0).toUpperCase() + type.slice(1), // Capitalize the type
          entityId: id,
          link: `/${type}/${id}` // Link to the post, trip, or itinerary
      }); 
    }
  }

  res.json({ tagged: true, count: doc.taggedUsers.length });
}