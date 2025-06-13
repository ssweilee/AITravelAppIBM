const User = require('../models/User');

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
      .populate('followers followings', 'firstName lastName');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fecth profile', error: err.message });
  }
}

exports.getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'firstName lastName')
      .populate('followings', 'firstName lastName');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load user', error: err.message });
  }
};

