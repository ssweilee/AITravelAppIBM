const Message = require('../models/Message');
const Chat = require('../models/Chat');

// Get messages and mark messages from other users as read
exports.getMessagesForChat = async (req, res) => {
  const chatId = req.params.chatId;
  const currentUserId = req.user.userId;

  try {
    // Fetch all messages in the chat
    const messages = await Message.find({ chatId })
      .populate('senderId', 'firstName lastName')
      .populate({
        path: 'sharedContent.itemId',
        populate: { path: 'userId', select: 'firstName lastName' }
      })
      .sort('createdAt');

    // Filter messages that are unread and sent by someone else
    const unreadMessages = messages.filter(
      msg => msg.senderId.toString() !== currentUserId &&
             !msg.readBy.includes(currentUserId)
    );

    // Mark those messages as read by current user
    const updatePromises = unreadMessages.map(msg =>
      Message.findByIdAndUpdate(msg._id, {
        $addToSet: { readBy: currentUserId }
      })
    );

    await Promise.all(updatePromises);

    res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Failed to fetch messages", error: err.message });
  }
};

// Send a new message and update chat's lastMessage
exports.sendMessage = async (req, res) => {
  const { chatId } = req.params;
  const { text } = req.body;
  const senderId = req.user.userId;

  if (!text || !chatId || !senderId) {
    return res.status(400).json({ message: "Message text is required." });
  }

  try {
    console.log("Creating message:", { chatId, senderId, text });

    let createdMessage = await Message.create({
      chatId,
      senderId,
      text,
      readBy: [senderId], // sender has read their own message
    });

    const message = await Message.findById(createdMessage._id).populate('senderId', 'firstName lastName');

    // Update the chat's last message reference
    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    res.status(201).json(message);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};

// ❌ No longer needed if using automatic read marking
exports.markMessagesAsRead = async (req, res) => {
  const chatId = req.params.chatId;
  const userId = req.user.userId;

  try {
    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: userId },
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ message: "Failed to mark messages as read", error: err.message });
  }
};
exports.shareContent = async (req, res) => {
  const { chatId } = req.params;
  let { contentType, itemId } = req.body;

   

   try {
    contentType = contentType.charAt(0).toUpperCase() + contentType.slice(1);

    const created = await Message.create({
      chatId,
      senderId: req.user.userId,
      text:     '[shared a post]',
      type:     'share',
      sharedContent: { contentType, itemId }
      });

    // 2) Populate using the real paths:
  const msg = await Message.findById(created._id)
    .populate('senderId', 'firstName lastName username')
    .populate('sharedContent.itemId')
    // 3) (Optional) update chat’s lastMessage:
    await Chat.findByIdAndUpdate(chatId, { lastMessage: msg._id });

    return res.status(201).json(msg);
  } catch (err) {
    console.error('Error sharing content:', err);
    return res.status(500).json({ message: 'Failed to share content', error: err.message });
  }
};