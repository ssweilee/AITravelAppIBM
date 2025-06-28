const User = require('../models/User');
const Trip = require('../models/Trip');
const Review = require('../models/Review');

exports.followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id; // user to be followed
    const currentUserId = req.user.userId;

    console.log('Trying to follow:', req.params.id);
    console.log('Current user ID:', req.user.userId);

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyFollowing = currentUser.followings.includes(targetUserId);

    if (alreadyFollowing) {
      // Unfollow logic
      currentUser.followings.pull(targetUserId);
      targetUser.followers.pull(currentUserId);
      await currentUser.save();
      await targetUser.save();
      return res.status(200).json({ message: "User unfollowed" });
    } else {
      // Follow logic
      if (!currentUser.followings.includes(targetUserId)) {
        currentUser.followings.push(targetUserId);
      }
      if (!targetUser.followers.includes(currentUserId)) {
        targetUser.followers.push(currentUserId);
      }
      await currentUser.save();
      await targetUser.save();
      return res.status(200).json({ message: "User followed" });
    }
  } catch (err) {
    res.status(500).json({ message: "Follow action failed", error: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('followers', 'firstName lastName')
      .populate('trips')
      .populate('reviews');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fecth profile', error: err.message });
  }
}

exports.getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'firstName lastName')
      .populate('trips')
      .populate('reviews');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load user', error: err.message });
  }
}

exports.updateUserProfile = async (userId, updatedData) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'bio', 'profilePicture', 'isPublic', 'country', 'travelStyle', 'dob'];
    const updates = {};
    for (const field of allowedFields) {
      if (updatedData[field] !== undefined) {
        updates[field] = updatedData[field];
      }
    }

    console.log('updateUserProfile - Updating user:', userId, 'with data:', updates);

    // Update user in MongoDB using Mongoose
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true, select: '-password' } // Return updated document, validate, exclude password
    );

    if (!user) {
      console.log('updateUserProfile - User not found:', userId);
      return null;
    }

    console.log('updateUserProfile - Updated user:', user);
    return user;
  } catch (error) {
    console.error('updateUserProfile - Database error:', error.message);
    throw new Error(error.message);
  }
};
exports.getSavedPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    // find the user and populate savedPosts with full Post docs
    const user = await User.findById(userId)
      .populate({
        path: 'savedPosts',
        populate: { path: 'userId', select: 'firstName lastName' } //include author info
      });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.savedPosts);
  } catch (err) {
    console.error('Error fetching saved posts:', err);
    res.status(500).json({ message: 'Failed to load saved posts', error: err.message });
  }
};
 exports.getFollowers = async (req, res) => {
   const currentUserId = req.user.userId;
   // default to empty string => returns all followers
   const { search = '' } = req.query;
   try {
     // 1) fetch just the array of follower IDs
     const currentUser = await User.findById(currentUserId).select('followings');
     const followerIds = currentUser.followings || [];

     // 2) query the User collection for those IDs + matching the search term
     const users = await User.find({
       _id: { $in: followerIds },
       $or: [
         { username:  { $regex: search, $options: 'i' } },
         { firstName: { $regex: search, $options: 'i' } },
         { lastName:  { $regex: search, $options: 'i' } }
       ]
     })
     .select('username firstName lastName');

     // 3) respond
     return res.json({ users });
   } catch (err) {
     console.error('Error fetching followers:', err);
     return res.status(500).json({
       message: 'Failed to fetch followers',
       error: err.message
     });
   }
 };
 // controllers/userController.js


exports.getSavedTrips = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Find all trips that this user has saved
    const trips = await Trip.find({ savedBy: userId })
      .populate('userId', 'firstName lastName')  // pull in the author’s name
      .sort({ updatedAt: -1 });                 // most-recently saved first

    return res.json(trips);
  } catch (err) {
    console.error('Error fetching saved trips:', err);
    return res
      .status(500)
      .json({ message: 'Failed to load saved trips', error: err.message });
  }
};
