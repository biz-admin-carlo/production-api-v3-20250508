const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const { 
    getAccountDetails, 
    updateAccountDetails, 
    deleteAccount, 
    updatePassword, 
    getPaymentHistory,
    getSubscriptionDetails,
    uploadProfileIcon
} = require('./controller');
const { uploadSingle } = require('../../utils/s3Uploader');

router.get('/account-details/', authMiddleware, getAccountDetails);
router.put('/account-details/', authMiddleware, updateAccountDetails);
router.put('/update-password/', authMiddleware, updatePassword);
router.delete('/delete-account/', authMiddleware, deleteAccount);
router.get('/payment-history/', authMiddleware, getPaymentHistory);
router.get('/subscription-details/', authMiddleware, getSubscriptionDetails);

router.post('/profile/upload-new-icon/', authMiddleware, uploadSingle, uploadProfileIcon);

  module.exports = router;
