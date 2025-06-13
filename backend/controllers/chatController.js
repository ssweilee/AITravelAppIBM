const Chat = require('../models/Chat');

exports.getOrCreateChat = async (req, res) => {
  const currentUserId = req.user.userId;
  const { otherUserId } = req.body;

  if (!otherUserId) {
    return res.status(400).json({ message: 'otherUserId is required' });
  }

  try {
    let chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [currentUserId, otherUserId], $size: 2 }
    });

    if (!chat) {
      chat = await Chat.create({
        members: [currentUserId, otherUserId],
        isGroup: false,
      });
    }

    await chat.populate('members', 'firstName lastName');
    res.status(200).json({chat});
  } catch (err) {
    console.log('Failed to get/create chat:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};