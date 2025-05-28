const User = require('./model');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcryptjs');
const Customer = require('../../webhooks/CustomerModel');

const fetchUserPayments = async (email) => {
  return await Customer.find({ 'paymentDetails.billingDetails.email': email }).sort({ createdAt: -1 }).lean();
};

const fetchAccountDetails = async (userId) => {
  const user = await User.findById(userId).select('-password');

  if (!user) throw new AppError('User not found', 404);

  return {
    id: user._id,
    fullName: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    birthday: user.birthday,
    userCode: user.userCode,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
    lastModifiedAt: user.lastModifiedAt
  };
};

const updateUserInfo = async (userId, updates) => {
  const allowedFields = ['firstName', 'lastName', 'birthday', 'contactNumber'];
  const updatePayload = {};

  for (const key of allowedFields) {
    if (updates[key] !== undefined) updatePayload[key] = updates[key];
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    userCode: user.userCode,
    birthday: user.birthday,
    contactNumber: user.contactNumber,
    referralCode: user.referralCode,
    updatedAt: user.updatedAt
  };
};

const deactivateUserAccount = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive: false } },
    { new: true }
  );

  if (!user) throw new AppError('User not found', 404);
  return true;
};

const updateUserPassword = async (userId, oldPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new AppError('Old password is incorrect.', 401);

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  await user.save();

  return user;
};

const fetchAllUsers = async () => {
  return await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
};

const fetchUserById = async (userID) => {
  return await User.findById(userID).lean();
};

module.exports = {
  fetchAccountDetails,
  updateUserInfo,
  deactivateUserAccount,
  fetchAllUsers,
  fetchUserById,
  updateUserPassword,
  fetchUserPayments
};