const User = require('../users/model');
const Biz = require('../biz/model');
const Customer = require('../../webhooks/CustomerModel');
const Dispute = require('../../webhooks/DisputeModel');
const mongoose = require('mongoose');

const AppError = require('../../utils/AppError');

const fetchAllUsers = async () => {
  return await User.find().select('-password').sort({ createdAt: -1 }).lean();
};

const updateUserCode = async (userId, newCode) => {
  const validCodes = ['0', '11', '12', '21', '22', '31'];

  if (!validCodes.includes(newCode)) {
    throw new AppError('Invalid user code provided.', 400);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { userCode: newCode } },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);

  return user;
};

const deactivateUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { isActive: false } },
    { new: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);
  return user;
};

const fetchAllDisputes = async () => {
  return await Dispute.find().sort({ createdAt: -1 }).lean();
};

const fetchUserById = async (userID) => {
  return await User.findById(userID).lean();
};

const fetchAllBiz = async () => {
  return await Biz.find({}).sort({ createdAt: -1 }).lean();
};

const fetchAllPayments = async () => {
  return await Customer.find().sort({ createdAt: -1 }).lean();
};

const fetchAllTransactions = async () => {
  return await Biz.find({
    isBizDB: true,
    userID: { $ne: '6652c7d6b250bf7f5f711a2f' }
  })
    .sort({ createdAt: -1 })
    .lean();
};

const deletePaymentById = async (paymentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new AppError('Invalid paymentId format', 400);
  }

  const deleted = await Customer.findByIdAndDelete(paymentId);
  if (!deleted) throw new AppError('Payment record not found', 404);

  return deleted;
};

module.exports = { fetchAllUsers, updateUserCode, deactivateUser, fetchUserById, fetchAllBiz, fetchAllTransactions, fetchAllPayments, deletePaymentById, fetchAllDisputes };