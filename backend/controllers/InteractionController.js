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

// Helper function to get the correct owner field
function getOwnerField(type) {
  switch (type) {
    case 'post':
      return 'userId';
    case 'trip':
      return 'userId';
    case 'itinerary':
      return 'createdBy'; // This is the key fix
    default:
      return 'userId';
  }
}

exports.toggleLike = async (req, res) => {
  try {
    const { type, id } = req.params;
    const userId = req.user.userId;
    const Model = getModel(type);
    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ message: `${type} not found` });

    // ensure likes is an array
    if (!Array.isArray(doc.likes)) {
      doc.likes = [];
    }

    const alreadyLiked = doc.likes.some(u => u.toString() === userId);
    const likedNow = !alreadyLiked;

    if (likedNow) {
      doc.likes.push(userId);
    } else {
      doc.likes = doc.likes.filter(u => u.toString() !== userId);
    }

    // determine owner using helper
    const ownerField = getOwnerField(type);
    const ownerIdRaw = doc[ownerField];
    const ownerId = ownerIdRaw ? ownerIdRaw.toString() : null;

    if (ownerId && ownerId !== userId) {
      const me = await User.findById(userId).select('firstName');
      await sendNotification({
        recipient: ownerId,
        sender: userId,
        type: 'like',
        text: `${me.firstName} liked your ${type}.`,
        entityType: type.charAt(0).toUpperCase() + type.slice(1),
        entityId: id,
        link: `/${type}/${id}`,
      });
    }

    await doc.save();

    res.json({
      liked: likedNow,
      count: doc.likes.length,
    });
  } catch (err) {
    console.error('toggleLike error:', err);
    res.status(500).json({
      message: 'Failed to toggle like',
      error: err.message,
    });
  }
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
              select: 'firstName lastName profilePicture'
            },
            {
              path: 'comments',
              populate: {
                path: 'userId',
                select: 'firstName lastName profilePicture'
              }
            }
          ]
        },
        {
          path: 'bindItinerary', // Also populate bound itineraries if any
          populate: {
            path: 'createdBy', // Use createdBy for itineraries
            select: 'firstName lastName profilePicture'
          }
        }
      ]
    };
  } else if (type === 'itinerary') {
    populatePath = {
      path: 'savedItineraries',
      populate: {
        path: 'createdBy', //  Use createdBy for itineraries
        select: 'firstName lastName profilePicture'
      }
    };
  } else if (type === 'trip') {
    //  populate posts within trips
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
            select: 'firstName lastName profilePicture'
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

      // Use the correct owner field
      const ownerField = getOwnerField(type);
      const ownerId = doc[ownerField];

      // send notification to the user
      if (ownerId && ownerId.toString() !== userId) {
        const me = await User.findById(userId).select('firstName');
        // Notify the user who is being mentioned
        await sendNotification({
          recipient: ownerId, // CHANGED: was doc.userId, now uses correct field
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
