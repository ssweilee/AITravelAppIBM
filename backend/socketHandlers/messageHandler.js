const Chat = require('../models/Chat');
const Message = require('../models/Message');

module.exports = (io, socket) => {
  socket.on('joinChat', async (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat ${chatId}`);
  });

  socket.on('sendMessage', async ({ chatId, message }) => {
    try {
      if (!message || !message.senderId || !message.text) {
        console.error("🚨 Invalid message payload:", message);
        return;
      }

      const newMessage = await Message.create({
        chatId,
        senderId: message.senderId,
        text: message.text,
        readBy: [message.senderId], // Optional: mimic REST controller
      });

      const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'firstName lastName');

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: newMessage._id,
        updatedAt: new Date(),
      });

      io.to(chatId).emit('receiveMessage', populatedMessage);

      console.log(`✅ Message saved and broadcasted in chat ${chatId}`);
    } catch (err) {
      console.error('❌ Full socket error stack:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconneceted', socket.id);
  });
}