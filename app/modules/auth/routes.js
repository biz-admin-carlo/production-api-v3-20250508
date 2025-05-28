const express = require('express');
const router = express.Router();
const { login, forgotPassword, register } = require('./controller');
const { loginLimiter } = require('../../middlewares/rateLimiter');

// POST /api/v2/auth/login/
router.post('/login/', loginLimiter, login);
router.post('/forgot-password/', forgotPassword);
router.post('/create-user/', register);

module.exports = router;
