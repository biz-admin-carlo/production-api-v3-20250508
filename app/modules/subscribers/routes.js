const express = require('express');
const authMiddleware = require('../../middlewares/authMiddleware');
const { 
    createBillingDetails, 
    fetchBillingDetails,
    planUpdates,
} = require('./controller');

const router = express.Router();

router.post('/billing-details', authMiddleware, createBillingDetails);
router.get ('/billing-details', authMiddleware, fetchBillingDetails);

router.post('/plan-updates', authMiddleware, planUpdates)
module.exports = router;
