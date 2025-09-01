const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIo } = require('../utils/getIo');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification
      .find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'firstName lastName profilePicture')
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error('Failed to load notifications:', err);
    res.status(500).json({ message: 'Failed to load notifications', error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const notif = await Notification.findOne({ _id: id, recipient: req.user.userId }).session(session);
    if (!notif) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Notification not found' });
    }

    let updatedCount;
    if (!notif.isRead) {
      notif.isRead = true;
      await notif.save({ session });

      const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        { $inc: { unreadNotificationCount: -1 } },
        { new: true, session }
      );
      updatedCount = updatedUser.unreadNotificationCount;
    } else {
      const user = await User.findById(req.user.userId).select('unreadNotificationCount').session(session);
      updatedCount = user.unreadNotificationCount;
    }

    await session.commitTransaction();

    try {
      const io = getIo();
      io.to(req.user.userId.toString()).emit('notification-read', {
        type: 'notification-read',
        notificationId: id,
        unreadCount: updatedCount,
      });
    } catch (e) {
      console.warn('Could not emit notification-read:', e);
    }

    const populatedNotif = await Notification.findById(id)
      .populate('sender', 'firstName lastName profilePicture')
      .lean();

    return res.json({ success: true, notification: populatedNotif, unreadCount: updatedCount });
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) {}
    console.error('markAsRead error:', err);
    return res.status(500).json({ message: 'Failed to mark as read', error: err.message });
  } finally {
    session.endSession();
  }
};

exports.clearNotifications = async (req, res) => {
  // mark all as read
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    await Notification.updateMany(
      { recipient: req.user.userId, isRead: false },
      { $set: { isRead: true } },
      { session }
    );

    await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { unreadNotificationCount: 0 } },
      { session }
    );

    await session.commitTransaction();

    try {
      const io = getIo();
      io.to(req.user.userId.toString()).emit('notifications-cleared', {
        type: 'notifications-cleared',
        unreadCount: 0,
      });
    } catch (e) {
      console.warn('Could not emit notifications-cleared:', e);
    }

    return res.json({ success: true, unreadCount: 0, message: 'All notifications marked read' });
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) {}
    console.error('clearNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Could not clear notifications', error: err.message });
  } finally {
    session.endSession();
  }
};

// delete all notifications entirely
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.userId });
    await User.findByIdAndUpdate(req.user.userId, { $set: { unreadNotificationCount: 0 } });

    try {
      const io = getIo();
      io.to(req.user.userId.toString()).emit('notifications-cleared', {
        type: 'notifications-cleared',
        unreadCount: 0,
      });
    } catch (e) {
      console.warn('Emit failed in deleteAllNotifications:', e);
    }

    return res.json({ success: true, unreadCount: 0, message: 'All notifications deleted' });
  } catch (err) {
    console.error('deleteAllNotifications error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not delete all notifications',
      error: err.message
    });
  }
};

exports.deleteNotification = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;

    // Load the notification to know if it was unread
    const notif = await Notification.findOne({
      _id: id,
      recipient: req.user.userId
    }).session(session);

    if (!notif) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Notification not found' });
    }

    let updatedCount;
    if (!notif.isRead) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        { $inc: { unreadNotificationCount: -1 } },
        { new: true, session }
      );
      updatedCount = updatedUser.unreadNotificationCount;
    } else {
      const user = await User.findById(req.user.userId)
        .select('unreadNotificationCount')
        .session(session);
      updatedCount = user.unreadNotificationCount;
    }

    // Delete it
    await Notification.deleteOne({ _id: id, recipient: req.user.userId }).session(session);

    await session.commitTransaction();

    // Emit to socket(s)
    try {
      const io = getIo();
      io.to(req.user.userId.toString()).emit('notification-deleted', {
        type: 'notification-deleted',
        notificationId: id,
        unreadCount: updatedCount,
      });
    } catch (e) {
      console.warn('Could not emit notification-deleted:', e);
    }

    return res.json({ success: true, unreadCount: updatedCount });
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) {}
    console.error('deleteNotification error:', err);
    return res.status(500).json({ message: 'Failed to delete notification', error: err.message });
  } finally {
    session.endSession();
  }
};


exports.getUnreadCount = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('unreadNotificationCount');
    res.json({ unreadCount: user?.unreadNotificationCount || 0 });
  } catch (err) {
    console.error('Failed to get unread count:', err);
    res.status(500).json({ message: 'Failed to get unread count' });
  }
};



