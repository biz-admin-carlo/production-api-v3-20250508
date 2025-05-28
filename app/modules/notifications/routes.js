const express = require('express');
const router = express.Router();
const { getUnreadNotificationCount } = require('./controller');
const authMiddleware = require('../../middlewares/authMiddleware');

router.get('/unread-count', authMiddleware, getUnreadNotificationCount);

module.exports = router;
