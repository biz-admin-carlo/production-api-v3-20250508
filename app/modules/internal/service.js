const User      = require('../users/model');
const Biz       = require('../biz/model');
const Customer  = require('../../webhooks/CustomerModel');
const Dispute   = require('../../webhooks/DisputeModel');
const mongoose  = require('mongoose');
const { Types } = mongoose;
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

const getBizStats = async () => {
  const monthStart = Math.floor(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000
  );

  const stats = await Biz.aggregate([
    // Count ALL businesses (no pagination)
    {
      $facet: {
        // Total count
        total: [
          { $count: 'count' }
        ],
        
        // Paid services count
        paid: [
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
                      $gte: ['$paymentDetails.createdTimestamp', monthStart]
                    }
                  }
                },
                { $limit: 1 }
              ],
              as: 'payments'
            }
          },
          { $match: { 'payments.0': { $exists: true } } },
          { $count: 'count' }
        ],
        
        // Free listings count (no payment this month)
        free: [
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
                      $gte: ['$paymentDetails.createdTimestamp', monthStart]
                    }
                  }
                },
                { $limit: 1 }
              ],
              as: 'payments'
            }
          },
          { $match: { 'payments.0': { $exists: false } } },
          { $count: 'count' }
        ],
        
        // Overdue count
        overdue: [
          { $match: { bizStatus: 'overdue' } },
          { $count: 'count' }
        ]
      }
    }
  ]);

  const result = stats[0];
  
  return {
    total: result.total[0]?.count || 0,
    paid: result.paid[0]?.count || 0,
    free: result.free[0]?.count || 0,
    overdue: result.overdue[0]?.count || 0
  };
};

const fetchAllBizWithPaymentTracking = async (
  matchCriteria = {},
  skip = 0,
  limit = 10,
  sortBy = 'createdAt',
  sortOrder = -1
) => {
  const monthStart = Math.floor(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000
  );

  const sortObj = {};
  sortObj[sortBy] = sortOrder;

  return Biz.aggregate([
    // 1. Filter first (if any match criteria)
    ...(Object.keys(matchCriteria).length > 0 ? [{ $match: matchCriteria }] : []),
    
    // 2. Sort
    { $sort: sortObj },
    
    // 3. Pagination
    { $skip: skip },
    { $limit: limit },

    // 4. Lookup user registration
    {
      $lookup: {
        from: 'users',
        localField: 'email',
        foreignField: 'email',
        as: 'matchedUsers',
      },
    },

    // 5. Lookup payments
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
                $gte: ['$paymentDetails.createdTimestamp', monthStart],
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

    // 6. Add computed fields
    {
      $addFields: {
        isRegistered: { $gt: [{ $size: '$matchedUsers' }, 0] },
        isPaidThisMonth: { $gt: [{ $size: '$paymentsThisMonth' }, 0] },
        lastPaidAt: {
          $cond: [
            { $gt: [{ $size: '$paymentsThisMonth' }, 0] },
            {
              $toDate: {
                $multiply: [{ $max: '$paymentsThisMonth.paidAtSec' }, 1000],
              },
            },
            null,
          ],
        },
      },
    },

    // 7. Clean up
    { $project: { matchedUsers: 0, paymentsThisMonth: 0 } },
  ]);
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

function buildUpdateDoc(payload) {
  const { bizId, ...rest } = payload;

  const set = {};
  const unset = {};

  const assign = (path, value) => {
    if (value === undefined) return;     
    if (value === null) { unset[path] = ""; return; } 
    set[path] = value;
  };

  const flat = [
    'alias','name','image_url','is_closed','url','review_count','rating','email',
    'phone','display_phone','isArchived','isArchivedId','isBizDB','userID',
    'bizStatus','paymentStatus','subscriptionName','paymentGateway',
    'customerEmail','amountTransacted','agentName','agentId'
  ];
  flat.forEach(k => assign(k, rest[k]));

  assign('transactions', rest.transactions);
  assign('categories',   rest.categories);
  assign('keywords',     rest.keywords);

  if (rest.coordinates !== undefined) {
    if (rest.coordinates === null) {
      unset['coordinates'] = "";
    } else {
      const { type, coordinates } = rest.coordinates || {};
      if (type && Array.isArray(coordinates) && coordinates.length === 2) {
        assign('coordinates', { type, coordinates: [Number(coordinates[0]), Number(coordinates[1])] });
      } else {
      }
    }
  }

  if (rest.location !== undefined) {
    if (rest.location === null) {
      unset['location'] = "";
    } else {
      const loc = rest.location;
      const locKeys = ['address1','address2','address3','city','zip_code','country','state','display_address'];
      locKeys.forEach(k => assign(`location.${k}`, loc[k]));
    }
  }

  const update = {};
  if (Object.keys(set).length)   update.$set   = set;
  if (Object.keys(unset).length) update.$unset = unset;
  return update;
}

async function updateBizInMongo(payload) {
  const { bizId } = payload;

  if (!mongoose.Types.ObjectId.isValid(bizId)) {
    const err = new Error('Invalid bizId format');
    err.status = 400;
    throw err;
  }

  const exists = await Biz.findById(bizId).lean();
  if (!exists) return null;

  const update = buildUpdateDoc(payload);

  if (!update.$set && !update.$unset) {
    return await Biz.findById(bizId).lean();
  }

  const updated = await Biz.findOneAndUpdate(
    { _id: bizId },
    update,
    { new: true, runValidators: true }
  ).lean();

  return updated;
}

module.exports = { 
  fetchAllUsers, 
  updateUserCode, 
  deactivateUser, 
  fetchUserById, 
  fetchAllBiz, 
  fetchAllTransactions, 
  getBizStats,
  fetchAllTransactionsWithUserCheck,
  fetchAllTransactionsWithUserAndPayment,
  fetchAllPayments, 
  deletePaymentById, 
  fetchAllDisputes,
  fetchLatestSubscriberBillingDetails,
  fetchAllSubscriberBillingDetails,
  fetchAllLatestSubscriberBillingDetailsPerUser,
  updateBizInMongo,
  fetchAllBizWithPaymentTracking
};