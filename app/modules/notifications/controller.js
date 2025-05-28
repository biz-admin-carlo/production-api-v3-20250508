const { countUnreadNotifications } = require('./service');
const AppError = require('../../utils/AppError');

const getUnreadNotificationCount = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const count = await countUnreadNotifications(userId);
    return res.status(200).json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUnreadNotificationCount };
