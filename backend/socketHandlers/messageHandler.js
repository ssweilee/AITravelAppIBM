const Chat             = require('../models/Chat');
const Message          = require('../models/Message');
const sendNotification = require('../utils/notify');

module.exports = (io, socket) => {
  socket.on('joinChat', async (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat ${chatId}`);
  });

  socket.on('sendMessage', async ({ chatId, message }) => {
    try {
      if (!message || !message.senderId || !message.text) {
        console.error("Invalid message payload:", message);
        return;
      }

      // 1) Save the message
      const newMessage = await Message.create({
        chatId,
        senderId: message.senderId,
        text:     message.text,
        readBy:   [message.senderId],
      });

      // 2) Populate and update chat
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'firstName lastName profilePicture');
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: newMessage._id,
        updatedAt:   new Date(),
      });

      // 3) Broadcast to chat room
      io.to(chatId).emit('receiveMessage', populatedMessage);
      console.log(`✅ Message saved and broadcasted in chat ${chatId}`);

      // 4) Notify each other member
      try {
        const chat = await Chat.findById(chatId).select('members');
        console.log('Chat members:', chat.members);

        for (const memberId of chat.members) {
          if (memberId.toString() !== populatedMessage.senderId._id.toString()) {
            await sendNotification({
              recipient:  memberId,
              sender:     populatedMessage.senderId._id,
              type:       'custom',
              text:       `${populatedMessage.senderId.firstName} sent you a message.`,
              entityType: 'Custom',
              entityId:   chatId,
              link:       `/chat/${chatId}`
            });
            console.log(`→ Queued chat notification for ${memberId}`);
          }
        }
      } catch (notifErr) {
        console.error('Failed to queue chat notifications:', notifErr);
      }

    } catch (err) {
      console.error('Full socket error stack:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
  });
};