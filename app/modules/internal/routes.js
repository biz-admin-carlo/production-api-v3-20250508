const express = require('express');
const internalMiddleware = require('../../middlewares/internalMiddleware');
const {
  getAllUsers,
  getUserById,
  getAllBiz,
  getAllTransactions,
  getAllPayments,
  deletePayment,
  getAllDisputes,
  getCheckPayment,
  updateAccountType,
  deleteUserAccount
} = require('./controller');

const router = express.Router();

router.get('/users/', internalMiddleware, getAllUsers);
router.get('/fetch-user/:userID/', internalMiddleware, getUserById);
router.get('/fetch-biz/', internalMiddleware, getAllBiz);
router.get('/fetch-transactions/', internalMiddleware, getAllTransactions);
router.get('/fetch-payments/', internalMiddleware, getAllPayments);
router.get('/fetch-disputes/', internalMiddleware, getAllDisputes);
router.post('/check-payment/', internalMiddleware, getCheckPayment);
router.put('/type-updates/', internalMiddleware, updateAccountType);
router.delete('/users/', internalMiddleware, deleteUserAccount);
router.delete('/payment/', internalMiddleware, deletePayment);

module.exports = router;