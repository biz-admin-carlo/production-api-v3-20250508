const User = require('./model');
const Biz = require('../biz/model');
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
    contactNumber: user.contactNumber,
    userCode: user.userCode,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
    lastModifiedAt: user.lastModifiedAt,
    profileImageUrl: user.profileImageUrl,
    isActive: user.isActive
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

const PLAN_PRICE_MAP = new Map([
  [4999,   'Starter Setup Monthly'],
  [53988,  'Starter Setup Annually'],
  [9999,   'Advanced Setup Monthly'],
  [107988, 'Advanced Setup Annually'],
  [4499,   'Professional Revamp Monthly'],
  [39999,  'Professional Revamp Annually'],
  [19999,  'Standard Package Monthly'],
]);

function guessPlanNameFromAmount(amountCents) {
  return typeof amountCents === 'number' ? PLAN_PRICE_MAP.get(amountCents) || null : null;
}

function parseBizAmountToCents(val) {
  if (val == null) return null;
  if (typeof val === 'number') return Math.round(val * 100);          
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(num)) return Math.round(num * 100);
  }
  return null;
}

function extractBizOwnerEmail(biz) {
  return (
    biz.customerEmail ||
    biz.ownerEmail ||
    biz.contactEmail ||
    biz.businessContactEmail ||
    biz.email ||
    null
  );
}

function detectCadence(biz, planText) {
  if (biz.subscriptionCadence) {
    const c = biz.subscriptionCadence.toLowerCase();
    if (c.startsWith('month')) return 'monthly';
    if (c.startsWith('year') || c.startsWith('annual')) return 'annually';
  }
  if (biz.billingCadence) {
    const c = biz.billingCadence.toLowerCase();
    if (c.includes('month')) return 'monthly';
    if (c.includes('year') || c.includes('annual')) return 'annually';
  }
  if (planText) {
    const s = planText.toLowerCase();
    if (s.includes('annual') || s.includes('year')) return 'annually';
    if (s.includes('month')) return 'monthly';
  }
  return null;
}

function calcNextBillingIso(lastPaidAtIso, cadence) {
  if (!lastPaidAtIso || !cadence) return null;
  const d = new Date(lastPaidAtIso);
  if (Number.isNaN(d.getTime())) return null;
  if (cadence === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (cadence === 'annually') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    return null;
  }
  return d.toISOString();
}

const fetchSubscriptionDetails = async (userId) => {
  const user = await User.findById(userId)
    .select('firstName lastName fullName email')
    .lean();
  if (!user) throw new AppError('User not found', 404);

  const subscriberEmail = user.email ? user.email.toLowerCase() : null;
  if (!subscriberEmail) {
    throw new AppError('Subscriber has no email on file.', 400);
  }

  const ownerName =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    '(Unnamed User)';

  const bizList = await Biz.find({
    $or: [
      { customerEmail: subscriberEmail },
      { ownerEmail: subscriberEmail },
      { contactEmail: subscriberEmail },
      { businessContactEmail: subscriberEmail },
      { email: subscriberEmail },
    ],
  })
    .select(
      'name bizName businessName customerEmail ownerEmail contactEmail businessContactEmail email subscriptionName subscriptionPlan planName subscriptionAmount amountTransacted paymentStatus bizStatus paymentGateway currency subscriptionCadence billingCadence'
    )
    .lean();

  const slugify = (name = "") =>
      encodeURIComponent(name.trim().replace(/\s+/g, "-").toLowerCase());

  const emailSet = new Set([subscriberEmail]);
  for (const biz of bizList) {
    const em = extractBizOwnerEmail(biz);
    if (em) emailSet.add(String(em).toLowerCase());
  }
  const emailArr = [...emailSet];

  const custDocs = await Customer.find({
    'paymentDetails.billingDetails.email': { $in: emailArr },
  })
    .sort({ 'paymentDetails.createdTimestamp': -1 })
    .lean();

  const latestByEmail = {};
  for (const doc of custDocs) {
    const e =
      doc?.paymentDetails?.billingDetails?.email?.toLowerCase() ||
      doc?.email?.toLowerCase();
    if (!e) continue;
    const ts = doc?.paymentDetails?.createdTimestamp ?? 0;
    if (!latestByEmail[e] || ts > latestByEmail[e].ts) {
      latestByEmail[e] = { doc, ts };
    }
  }

  const subscriptions = bizList.map((biz) => {
    const email = (extractBizOwnerEmail(biz) || subscriberEmail).toLowerCase();
    const paymentHit = latestByEmail[email]?.doc;
    const pd = paymentHit?.paymentDetails || {};

    const lastPaidAt = pd.createdTimestamp
      ? new Date(pd.createdTimestamp * 1000).toISOString()
      : null;

    let amountCents = null;
    if (typeof biz.subscriptionAmount === 'number') {
      amountCents = biz.subscriptionAmount;
    } else {
      const fromBizDollars = parseBizAmountToCents(biz.amountTransacted);
      amountCents = fromBizDollars != null
        ? fromBizDollars
        : (typeof pd.amount === 'number' ? pd.amount : null);
    }

    const planFromBiz =
      biz.subscriptionName ||
      biz.subscriptionPlan ||
      biz.planName ||
      null;
    const planFromAmount = guessPlanNameFromAmount(amountCents);
    const planName = planFromBiz || planFromAmount || 'Custom / Unknown Plan';

    const cadence = detectCadence(biz, planName);
    const nextBillingAt = calcNextBillingIso(lastPaidAt, cadence);

    const currency = biz.currency || pd.currency || 'usd';

    const bizStatus = biz.bizStatus || null;
    const paymentStatus = biz.paymentStatus || null;
    const paymentGateway = biz.paymentGateway || (paymentHit ? 'Stripe' : null);

    const businessName =
      biz.name || biz.bizName || biz.businessName || '(Unnamed Business)';

    return {
      bizId: biz._id,
      businessName,
      slugBizName: slugify(businessName),
      businessOwner: ownerName,
      email,
      planName,
      cadence,           
      amountCents,
      amountFormatted:
        amountCents != null ? (amountCents / 100).toFixed(2) : null,
      currency,
      lastPaidAt,
      nextBillingAt,      
      receiptUrl: pd.receiptUrl || null,
      bizStatus,
      paymentStatus,
      paymentGateway,
    };
  });

  return {
    userId: user._id,
    businessOwner: ownerName,
    subscriberEmail,
    subscriptions,
  };
};

const saveProfileImage = async (userId, url) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set : { profileImageUrl: url }, // latest
      $push: { profileImageUrls: url } // history
    },
    { new: true }
  ).select('_id');

  if (!user) throw new AppError('User not found', 404);
  return true;
};

module.exports = {
  fetchAccountDetails,
  updateUserInfo,
  deactivateUserAccount,
  fetchAllUsers,
  fetchUserById,
  updateUserPassword,
  fetchUserPayments,
  fetchSubscriptionDetails,
  saveProfileImage
};