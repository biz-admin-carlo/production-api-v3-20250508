// app/modules/subscribers/routes.js
const express = require('express');
const authMiddleware = require('../../middlewares/authMiddleware');
const { createBillingDetails, fetchBillingDetails } = require('./controller');

const router = express.Router();

router.post('/billing-details', authMiddleware, createBillingDetails);
router.get ('/billing-details', authMiddleware, fetchBillingDetails);

module.exports = router;
