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
  const userId       = req.user.userId;
  // only support saving posts for now:
  if (type !== 'post') 
    return res.status(400).json({ message: 'Can only save posts' });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const idx = user.savedPosts.findIndex(p=>p.toString()===id);
  if (idx >= 0) user.savedPosts.splice(idx,1);
  else          user.savedPosts.push(id);

  await user.save();
  res.json({
    saved: idx<0,
    count: user.savedPosts.length
  });
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

