const { fetchAllUsers, updateUserCode, deactivateUser, fetchUserById, fetchAllBiz, fetchAllTransactions, fetchAllPayments, deletePaymentById, fetchAllDisputes } = require('./service');
const AppError = require('../../utils/AppError');

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
    const businesses = await fetchAllTransactions();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: businesses
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

module.exports = { getAllUsers, updateAccountType, deleteUserAccount, getUserById, getAllBiz, getAllTransactions, getAllPayments, deletePayment, getAllDisputes, getCheckPayment };