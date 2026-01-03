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
  deleteUserAccount,
  getUpdatedCardDetails,
  editBizDetails,
  toggleOverdueStatus,      
  bulkUpdateBizStatus
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

router.put('/biz-details/', internalMiddleware, editBizDetails);

// router.get('/updated-card-details/:userId/', internalMiddleware, getUpdatedCardDetails);

/**
 * @route   PATCH /internal/biz/:bizId/status
 * @desc    Quick toggle business status (overdue/active)
 * @access  Private (Superadmin via internalMiddleware)
 * @body    { bizStatus: "overdue" | "active" }
 */
router.patch('/biz/:bizId/status', internalMiddleware, toggleOverdueStatus);

/**
 * @route   PATCH /internal/biz/bulk/status
 * @desc    Bulk update business status for multiple businesses
 * @access  Private (Superadmin via internalMiddleware)
 * @body    { bizIds: ["id1", "id2"], bizStatus: "overdue" }
 */
router.patch('/biz/bulk/status', internalMiddleware, bulkUpdateBizStatus);

module.exports = router;