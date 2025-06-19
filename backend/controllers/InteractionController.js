const Post = require('../models/Post');
const User = require('../models/User');
const Trip = require('../models/Trip');
 function getModel(type) {
  switch (type) {
    case 'post':
      return Post;
    case 'trip':
      return Trip;
      /*case Itinerary:
        return Itinerary;
        */
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
  const arr = type==='post' ? doc.likes : doc.likedBy;  
  const idx = arr.findIndex(u=>u.toString()===userId);
  if (idx >= 0) arr.splice(idx,1);
  else          arr.push(userId);

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
    if (!doc.taggesdUsers.includes(userId)) {
      doc.taggesdUsers.push(userId);
      await doc.save();
    }
        res.json({ tagged: true, count: doc.taggedUsers.length });
    }

