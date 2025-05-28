const Notification = require('./model');

const countUnreadNotifications = async (userId) => {
  return await Notification.countDocuments({ userId, isSeen: false });
};

module.exports = { countUnreadNotifications };
