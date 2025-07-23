const User      = require('../users/model');
const Biz       = require('../biz/model');
const Customer  = require('../../webhooks/CustomerModel');
const Dispute   = require('../../webhooks/DisputeModel');
const mongoose  = require('mongoose');
const { Types } = mongoose;
const prisma = require('../../../lib/prisma');
const AppError = require('../../utils/AppError');

const {
  getBillingDetailsByUser,
  getAllBillingDetails,
  getLatestBillingDetailsPerUser,
} = require('../subscribers/service');

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

const baseMatch = {
  isBizDB: true,
  userID : { $ne: new Types.ObjectId('6652c7d6b250bf7f5f711a2f') },
};

const fetchAllTransactions = async () =>
  Biz.find(baseMatch)
     .sort({ createdAt: -1 })
     .lean();

const fetchAllTransactionsWithUserCheck = async () =>
  Biz.aggregate([
    { $match: baseMatch },
    {
      $lookup: {
        from        : 'users',    
        localField  : 'email',
        foreignField: 'email',
        as          : 'matchedUsers',
      },
    },
    {
      $addFields: {
        isRegisteredInBiz: { $gt: [{ $size: '$matchedUsers' }, 0] },
      },
    },
    { $project: { matchedUsers: 0 } },
    { $sort: { createdAt: -1 } },
]);

const fetchAllTransactionsWithUserAndPayment = async () => {
  const monthStart = Math.floor(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000
  );

  return Biz.aggregate([
    { $match: baseMatch },

    {
      $lookup: {
        from: 'users',
        localField: 'email',
        foreignField: 'email',
        as: 'matchedUsers',
      },
    },

    {
      $lookup: {
        from: 'customers',
        let: { email: '$email' },
        pipeline: [
          { $match: { $expr: { $eq: ['$email', '$$email'] } } },
          { $unwind: '$paymentDetails' },

          {
            $match: {
              $expr: {
                $gte: [
                  '$paymentDetails.createdTimestamp',
                  monthStart,
                ],
              },
            },
          },

          {
            $project: {
              _id: 0,
              paidAtSec: '$paymentDetails.createdTimestamp',
            },
          },
        ],
        as: 'paymentsThisMonth',
      },
    },

    {
      $addFields: {
        isRegistered    : { $gt: [{ $size: '$matchedUsers'     }, 0] },
        isPaidThisMonth : { $gt: [{ $size: '$paymentsThisMonth'}, 0] },

        lastPaidAt: {
          $cond: [
            { $gt: [{ $size: '$paymentsThisMonth' }, 0] },
            {
              $toDate: {
                $multiply: [
                  { $max: '$paymentsThisMonth.paidAtSec' },
                  1000,                      
                ],
              },
            },
            null,
          ],
        },
      },
    },

    { $project: { matchedUsers: 0, paymentsThisMonth: 0 } },
    { $sort: { createdAt: -1 } },
  ]);
};

const deletePaymentById = async (paymentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new AppError('Invalid paymentId format', 400);
  }

  const deleted = await Customer.findByIdAndDelete(paymentId);
  if (!deleted) throw new AppError('Payment record not found', 404);

  return deleted;
};

const fetchLatestSubscriberBillingDetails = async (userId) => {
  return getBillingDetailsByUser(userId);
};

const fetchAllSubscriberBillingDetails = async () => {
  return getAllBillingDetails();
};

const fetchAllLatestSubscriberBillingDetailsPerUser = async () => {
  return getLatestBillingDetailsPerUser();
};

module.exports = { 
  fetchAllUsers, 
  updateUserCode, 
  deactivateUser, 
  fetchUserById, 
  fetchAllBiz, 
  fetchAllTransactions, 
  fetchAllTransactionsWithUserCheck,
  fetchAllTransactionsWithUserAndPayment,
  fetchAllPayments, 
  deletePaymentById, 
  fetchAllDisputes,
  fetchLatestSubscriberBillingDetails,
  fetchAllSubscriberBillingDetails,
  fetchAllLatestSubscriberBillingDetailsPerUser,
};