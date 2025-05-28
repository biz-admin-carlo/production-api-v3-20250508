const { 
  fetchAccountDetails, 
  updateUserInfo, 
  deactivateUserAccount, 
  fetchAllUsers, 
  fetchUserById, 
  updateUserPassword,
  fetchUserPayments
} = require('./service');
const AppError = require('../../utils/AppError');

const getAccountDetails = async (req, res, next) => {
  try {
    const user = await fetchAccountDetails(req.user.userId);
    res.status(200).json({ success: true, data: user, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
};

const updateAccountDetails = async (req, res, next) => {
  try {
    const updated = await updateUserInfo(req.user.userId, req.body);
    res.status(200).json({ success: true, message: 'Account updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    await deactivateUserAccount(req.user.userId);
    res.status(200).json({
      success: true,
      message: 'Account has been deactivated successfully'
    });
  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new AppError('Old password and new password are required.', 400);
    }

    const updatedUser = await updateUserPassword(userId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await fetchAllUsers();
    res.status(200).json({
      success: true,
      data: users,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { userID } = req.params;
    const user = await fetchUserById(userID);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const userEmail = req.user.email;

    if (!userEmail) {
      throw new AppError('User email not found in token.', 400);
    }
    const payments = await fetchUserPayments(userEmail);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: payments,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAccountDetails,
  updateAccountDetails,
  deleteAccount,
  getAllUsers,
  getUserById,
  updatePassword,
  getPaymentHistory
};