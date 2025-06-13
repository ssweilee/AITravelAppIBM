const Message = require('../models/Message');

exports.getMessageByChatId = async (req, res) => {
  const { chatId } = req.params;

  try {
    const messages = await Message.find({ chatId })
      .populate('senderId', 'firstName lastName') 
      .sort({ createdAt: 1 });
    
    res.status(200).json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
};



