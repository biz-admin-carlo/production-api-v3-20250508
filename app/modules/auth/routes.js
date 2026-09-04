const express = require('express');
const router = express.Router();
const {
    login,
    googleLogin,
    forgotPassword,
    register,
    registerSubsriber,
    getSubscriberByEmail,
    updateSubscriber
} = require('./controller');
const { loginLimiter } = require('../../middlewares/rateLimiter');
const { loginLogger } = require('../../middlewares/loginLogger');

router.post('/login/', loginLimiter, login);
router.post('/google/', loginLimiter, googleLogin);
router.post('/forgot-password/', forgotPassword);
router.post('/create-user/', register);
router.post('/create-subscriber/', registerSubsriber);
router.get('/subscriber/:email', getSubscriberByEmail);
router.patch('/subscriber/:id', updateSubscriber);

module.exports = router;