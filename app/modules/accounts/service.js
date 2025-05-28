const Biz = require('../biz/model');
const User = require('../users/model');
const mongoose = require('mongoose');
const AppError = require('../../utils/AppError');

const getAllBizByRole = async (userId, userCode) => {
  const objectId = new mongoose.Types.ObjectId(userId);

  if (userCode === '0' || userCode === '21') {
    return await Biz.find({
      isArchived: false,
      userID: objectId
    }).sort({ createdAt: -1 }).lean();
  }

  if (userCode === '22') {
    const supervisor = await User.findById(userId).lean();
    if (!supervisor || !supervisor.referralCode) {
      throw new AppError('Supervisor or referral code not found.', 404);
    }

    const teamMembers = await User.find({
      referredBy: supervisor.referralCode
    }).select('_id').lean();

    const teamMemberIds = teamMembers.map(member => member._id);

    return await Biz.find({
      isArchived: false,
      userID: { $in: teamMemberIds }
    }).sort({ createdAt: -1 }).lean();
  }

  return [];
};

const createNewBiz = async (user, details) => {
  const {
    name,
    email,
    phone,
    display_phone,
    alias,
    url,
    category_alias,
    category_title,
    keywords,
    coordinates_type,
    coordinates_coordinates,
    address1,
    address2,
    address3,
    city,
    zip_code,
    country,
    state,
    subscriptionName,
    paymentGateway,
    amountTransacted,
    customerEmail,
    bizStatus,
    paymentStatus
  } = details;

  if (!name || !category_title || !coordinates_coordinates || !subscriptionName) {
    throw new AppError('Missing required business fields.', 400);
  }

  const geoJSONCoordinates = {
    type: coordinates_type || 'Point',
    coordinates: coordinates_coordinates
  };

  const newBiz = new Biz({
    alias,
    name,
    is_closed: false,
    url,
    review_count: 0,
    categories: [{ alias: category_alias, title: category_title }],
    rating: 0,
    coordinates: geoJSONCoordinates,
    transactions: [],
    location: {
      address1,
      address2,
      address3,
      city,
      zip_code,
      country,
      state,
      display_address: []
    },
    phone,
    display_phone,
    email,
    userID: user.userId,
    subscriptionName,
    paymentGateway,
    customerEmail,
    amountTransacted: amountTransacted ? parseFloat(amountTransacted) : null,
    agentName: `${user.userFirstName} ${user.userLastName}`,
    agentId: user.userId,
    keywords: keywords && keywords.length > 0 ? keywords : [],
    bizStatus,
    paymentStatus,
    isBizDB: true
  });

  await newBiz.save();

  return newBiz;
};

const editBizDetails = async (bizId, updates) => {
  const allowedFields = [
    'name', 'email', 'phone', 'bizStatus', 'paymentStatus',
    'subscriptionName', 'paymentGateway', 'amountTransacted', 'customerEmail'
  ];

  const updatePayload = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) updatePayload[key] = updates[key];
  }

  const updated = await Biz.findByIdAndUpdate(
    bizId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!updated) throw new AppError('Business not found', 404);

  return updated;
};

module.exports = {
  getAllBizByRole,
  createNewBiz,
  editBizDetails
};
