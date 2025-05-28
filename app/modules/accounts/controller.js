const { getAllBizByRole, createNewBiz, editBizDetails } = require('./service');
const AppError = require('../../utils/AppError');
const Notification = require('../../modules/notifications/model');

const getAllBiz = async (req, res, next) => {
  try {
    const { userId, userCode } = req.user;

    const businesses = await getAllBizByRole(userId, userCode);

    return res.status(200).json({
      success: true,
      total: businesses.length,
      data: businesses
    });
  } catch (err) {
    next(err);
  }
};

const createBiz = async (req, res, next) => {
  try {
    const user = req.user;
    const data = req.body;
    // io.to(userId.toString()).emit('new-notification', payload);

    const newBiz = await createNewBiz(user, data);

    // const now = new Date();
    // const notifications = [
    //   {
    //     userType: 0,
    //     message: `A new business "${newBiz.name}" has been created.`,
    //     isSeen: false,
    //     typeOfTransaction: 111,
    //     createdAt: now,
    //     businessId: newBiz._id,
    //     businessName: newBiz.name
    //   },
    //   {
    //     userType: 21,
    //     message: `Your business "${newBiz.name}" has been created successfully.`,
    //     isSeen: false,
    //     typeOfTransaction: 111,
    //     userId: user.userId,
    //     createdAt: now,
    //     businessId: newBiz._id,
    //     businessName: newBiz.name
    //   }
    // ];

    // if (user.referredBy) {
    //   notifications.push({
    //     userType: 22,
    //     message: `A business "${newBiz.name}" has been created by one of your team members.`,
    //     isSeen: false,
    //     typeOfTransaction: 111,
    //     referredBy: user.referredBy,
    //     createdAt: now,
    //     businessId: newBiz._id,
    //     businessName: newBiz.name
    //   });
    // }

    // const inserted = await Notification.insertMany(notifications);

    // inserted.forEach(notif => {
    //   if (notif.userId) {
    //     io.to(notif.userId.toString()).emit('new-notification', notif);
    //   }
    // });

    res.status(201).json({
      success: true,
      message: 'Business created successfully.',
      data: newBiz
    });
  } catch (err) {
    next(err);
  }
};

const editBiz = async (req, res, next) => {
  try {
    const { bizId, updates } = req.body;
    if (!bizId || !updates) throw new AppError('Missing bizId or updates', 400);

    const updatedBiz = await editBizDetails(bizId, updates);

    res.status(200).json({
      success: true,
      message: 'Business updated successfully.',
      data: updatedBiz
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllBiz, createBiz, editBiz };