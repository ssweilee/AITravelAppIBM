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
    res.status(200).json({ chat });
  } catch (err) {
    console.log('Failed to get/create chat:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

exports.getUserChats = async (req, res) => {
  const currentUserId = req.user.userId;
  try {
    const chats = await Chat.find({ members: currentUserId })
      .populate('members', 'firstName lastName')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'firstName lastName' }
      })
      .sort('-updatedAt');

    
    res.status(200).json(chats);
  } catch (err) {
    console.error("Failed to fetch user chats:", err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Create group chat with multiple members
exports.createGroupChat = async (req, res) => {
  const { members, chatName } = req.body;
  const currentUserId = req.user.userId;

  if (!members || !Array.isArray(members)) {
    return res.status(400).json({ message: 'Invalid members format' });
  }

  const allMembers = [...new Set([currentUserId, ...members])]; // Ensures no duplicate

  if (allMembers.length < 3) { // Current user + at least 2 members
    return res.status(400).json({ message: 'Please include at least 2 members.' });
  }

  try {
    const groupChat = await Chat.create({
      members: allMembers,
      isGroup: true,
      chatName: chatName || 'New Group',
    });

    await groupChat.populate('members', 'firstName lastName');

    res.status(201).json(groupChat);
  } catch (err) {
    console.error('Error creating group chat:', err);
    res.status(500).json({ message: 'Failed to create group chat', error: err.message });
  }
};

exports.getChatById = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId)
      .populate('members', 'firstName lastName')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'firstName lastName' }
      });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.status(200).json(chat);
  } catch (err) {
    console.error('Failed to get chat by ID:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Leave a group chat
exports.leaveGroupChat = async (req, res) => {
  const currentUserId = req.user.userId;
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Only allow leaving group chats
    if (!chat.isGroup) {
      return res.status(400).json({ message: "You can only leave group chats" });
    }

    // Remove the user from the chat
    chat.members = chat.members.filter(
      (memberId) => memberId.toString() !== currentUserId
    );

    // If no members left, optionally delete the chat
    if (chat.members.length === 0) {
      await Chat.findByIdAndDelete(chatId);
      return res.status(200).json({ message: "Chat deleted (no members left)" });
    }

    await chat.save();
    return res.status(200).json({ message: "You have left the group chat" });
  } catch (err) {
    console.error("Error leaving group chat:", err);
    return res.status(500).json({ message: "Failed to leave group chat", error: err.message });
  }
};