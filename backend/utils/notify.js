const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIo } = require('../utils/getIo');

async function sendNotification({
  recipient, sender, type, text, entityType, entityId, link = ''
}) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const newNotif = await Notification.create([{
      recipient,
      sender,
      type,
      text,
      entityType,
      entityId,
      link
    }], { session });

    const updatedUser = await User.findByIdAndUpdate(
      recipient,
      { $inc: { unreadNotificationCount: 1 } },
      { new: true, session }
    );

    await session.commitTransaction();

    const populatedNotif = await Notification.findById(newNotif[0]._id)
      .populate('sender', 'firstName lastName profilePicture')
      .lean();

    try {
      const io = getIo();
      io.to(recipient.toString()).emit('notification', {
        type: 'notification',
        payload: populatedNotif,
        unreadCount: updatedUser.unreadNotificationCount,
      });
    } catch (e) {
      console.warn('Failed to emit notification via socket:', e);
    }

    return populatedNotif;
  } catch (err) {
    await session.abortTransaction();
    console.error('Failed to send notification:', err);
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = sendNotification;
