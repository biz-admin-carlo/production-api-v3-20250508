const { 
  fetchAllUsers, 
  updateUserCode, 
  deactivateUser, 
  fetchUserById, 
  fetchAllBiz,
  fetchAllTransactionsWithUserAndPayment,
  fetchAllPayments, 
  deletePaymentById, 
  fetchAllDisputes,
  fetchAllSubscriberBillingDetails,
  updateBizInMongo,
} = require('./service');
const {
  getBillingDetails
} = require('../../modules/subscribers/service');
const AppError = require('../../utils/AppError');
const Customer = require('../../webhooks/CustomerModel');

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

const updateAccountType = async (req, res, next) => {
  try {
    const { userId, userCode } = req.body;
    if (!userId || !userCode) {
      throw new AppError('userId and userCode are required.', 400);
    }

    const updated = await updateUserCode(userId, userCode);
    res.status(200).json({
      success: true,
      message: 'User type updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

const deleteUserAccount = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new AppError('userId is required', 400);
    const result = await deactivateUser(userId);
    res.status(200).json({ success: true, message: 'User deactivated', data: result });
  } catch (err) {
    next(err);
  }
};

const getAllDisputes = async (req, res, next) => {
  try {
    const disputes = await fetchAllDisputes();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: disputes
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

const getAllBiz = async (req, res, next) => {
  try {
    const businesses = await fetchAllBiz();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: businesses
    });
  } catch (err) {
    next(err);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    const payments = await fetchAllPayments();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: payments
    });
  } catch (err) {
    next(err);
  }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const businesses = await fetchAllTransactionsWithUserAndPayment();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: businesses,
    });
  } catch (err) {
    next(err);
  }
};

const deletePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) throw new AppError('paymentId is required', 400);

    const result = await deletePaymentById(paymentId);
    res.status(200).json({
      success: true,
      message: 'Payment record deleted',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getCheckPayment = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Customer email is required', 400);

    const payments = await Customer.find({ 'paymentDetails.receiptEmail': email })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (err) {
    next(err);
  }
};

const getUpdatedCardDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    let data;

    if (userId) {
      // specific user latest
      data = await getBillingDetails(userId);
      console.log(data);
      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'No billing details found for this user.',
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    }

    if (String(latestPerUser).toLowerCase() === 'true') {
      data = await fetchAllLatestSubscriberBillingDetailsPerUser();
    } else {
      data = await fetchAllSubscriberBillingDetails(); // ALL rows
    }

    res.status(200).json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

const pickAllowedFields = (p = {}) => {
  const allowed = {
    bizId: p.bizId, 
    alias: p.alias,
    name: p.name,
    image_url: p.image_url,
    is_closed: p.is_closed,
    url: p.url,
    review_count: p.review_count,
    categories: p.categories,                
    rating: p.rating,
    email: p.email,
    coordinates: p.coordinates,              
    transactions: p.transactions,            
    location: p.location,                    
    phone: p.phone,
    display_phone: p.display_phone,
    isArchived: p.isArchived,
    isArchivedId: p.isArchivedId,            
    isBizDB: p.isBizDB,
    userID: p.userID,                        
    bizStatus: p.bizStatus,
    paymentStatus: p.paymentStatus,
    subscriptionName: p.subscriptionName,
    paymentGateway: p.paymentGateway,
    customerEmail: p.customerEmail,
    amountTransacted: p.amountTransacted,
    keywords: p.keywords,                    
    agentName: p.agentName,
    agentId: p.agentId
  };

  Object.keys(allowed).forEach(k => allowed[k] === undefined && delete allowed[k]);
  return allowed;
};

async function editBizDetails(req, res, next) {
  try {
    const body = pickAllowedFields(req.body || {});
    if (!body.bizId) {
      return res.status(400).json({ success: false, message: 'bizId is required' });
    }

    const updated = await updateBizInMongo(body, {
      actorUserId: req.user?.userId ?? null,
      actorEmail:  req.user?.email  ?? null
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Business details updated successfully',
      data: {
        _id: updated._id,
        alias: updated.alias,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        location: updated.location,
        categories: updated.categories,
        rating: updated.rating,
        isArchived: updated.isArchived,
        bizStatus: updated.bizStatus,
        paymentStatus: updated.paymentStatus,
        updatedAt: updated.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  getAllUsers, 
  updateAccountType, 
  deleteUserAccount, 
  getUserById, 
  getAllBiz, 
  getAllTransactions, 
  getAllPayments, 
  deletePayment, 
  getAllDisputes, 
  getCheckPayment,
  getUpdatedCardDetails,
  editBizDetails
};