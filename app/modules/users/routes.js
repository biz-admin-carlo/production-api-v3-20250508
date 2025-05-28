const express = require('express');
const router = express.Router();
const { getAccountDetails, updateAccountDetails, deleteAccount, updatePassword, getPaymentHistory } = require('./controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get('/account-details/', authMiddleware, getAccountDetails);
router.put('/account-details/', authMiddleware, updateAccountDetails);
router.put('/update-password/', authMiddleware, updatePassword);
router.delete('/delete-account/', authMiddleware, deleteAccount);
router.get('/payment-history/', authMiddleware, getPaymentHistory);

module.exports = router;
