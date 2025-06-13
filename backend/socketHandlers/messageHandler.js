const Chat = require('../models/Chat');
const Message = require('../models/Message');

module.exports = (io, socket) => {
  socket.on('joinChat', async (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat ${chatId}`);
  });

  socket.on('sendMessage', async ({ chatId, message }) => {
    try {
      const newMessage = await Message.create({
        chatId,
        senderId: message.senderId,
        text: message.text,
      });

      const populatedMessage = await newMessage.populate('senderId', 'firstName lastName');

      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: newMessage._id,
        updatedAt: new Date(),
      });

      io.to(chatId).emit('receiveMessage', populatedMessage);

      console.log(`Message saved abd broadcasted in chat ${chatId}`);
    } catch (err) {
      console.log('Error saving message:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconneceted', socket.id);
  });
}