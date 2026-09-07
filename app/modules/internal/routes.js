const express = require('express');
const internalMiddleware = require('../../middlewares/internalMiddleware');
const {
  getAllUsers,
  getUserById,
  getBizById,
  getAllBiz,
  getAllTransactions,
  getAllPayments,
  deletePayment,
  getAllDisputes,
  getCheckPayment,
  updateAccountType,
  deleteUserAccount,
  getUpdatedCardDetails,
  editBizDetails,
  toggleOverdueStatus,      
  bulkUpdateBizStatus,
  getAllBizSuper
} = require('./controller');

const router = express.Router();

router.get('/users/', internalMiddleware, getAllUsers);
router.get('/fetch-user/:userID/', internalMiddleware, getUserById);
router.get('/fetch-biz/', internalMiddleware, getAllBizSuper);
router.get('/biz/:bizId', internalMiddleware, getBizById);
router.get('/fetch-transactions/', internalMiddleware, getAllTransactions);
router.get('/fetch-payments/', internalMiddleware, getAllPayments);
router.get('/fetch-disputes/', internalMiddleware, getAllDisputes);
router.post('/check-payment/', internalMiddleware, getCheckPayment);
router.put('/type-updates/', internalMiddleware, updateAccountType);
router.delete('/users/', internalMiddleware, deleteUserAccount);
router.delete('/payment/', internalMiddleware, deletePayment);

router.put('/biz-details/', internalMiddleware, editBizDetails);
// router.get('/updated-card-details/:userId/', internalMiddleware, getUpdatedCardDetails);
router.patch('/biz/:bizId/status', internalMiddleware, toggleOverdueStatus);
router.patch('/biz/bulk/status', internalMiddleware, bulkUpdateBizStatus);

router.patch('/biz/:bizId/status', internalMiddleware, toggleOverdueStatus);
router.patch('/biz/bulk/status', internalMiddleware, bulkUpdateBizStatus);

module.exports = router;
