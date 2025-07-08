// controllers/notificationController.js
const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification
      .find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'firstName lastName profilePicture')  // include sender info
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error('Failed to load notifications:', err);
    res.status(500).json({ message: 'Failed to load notifications', error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true, notification: notif });
  } catch (err) {
    console.error('Failed to mark notification read:', err);
    res.status(500).json({ message: 'Failed to mark as read', error: err.message });
  }
};

// controllers/notificationController.js
exports.clearNotifications = async (req, res) => {
  try {
    // Delete (or you could update isRead=true for all) for this user
    await Notification.deleteMany({ recipient: req.user.userId });
    return res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    console.error('Failed to clear notifications:', err);
    return res.status(500).json({ success: false, message: 'Could not clear notifications' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    // Only delete notifications belonging to the current user
    const notif = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user.userId
    });
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete notification:', err);
    res.status(500).json({ message: 'Failed to delete notification', error: err.message });
  }
};



