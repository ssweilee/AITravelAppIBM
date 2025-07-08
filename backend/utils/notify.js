// utils/notify.js
const Notification = require('../models/Notification');

async function sendNotification({
  recipient, sender, type, text, entityType, entityId, link = ''
}) {
  try {
    await Notification.create({
      recipient, sender, type, text, entityType, entityId, link
    });
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

module.exports = sendNotification;
