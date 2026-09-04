const express = require('express');
const router = express.Router();

const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const bizRoutes = require('./modules/biz/routes');
const accountRoutes = require('./modules/accounts/routes');
const internalRoutes = require('./modules/internal/routes');
const logsRoutes = require('./modules/logs/routes');
const notificationRoutes = require('./modules/notifications/routes');
const subscriberRoutes = require('./modules/subscribers/routes');
const reviewRoutes = require('./modules/reviews/routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/biz', bizRoutes);
router.use('/accounts', accountRoutes);
router.use('/internal', internalRoutes);
router.use('/logs', logsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/subscriber', subscriberRoutes);
router.use('/reviews', reviewRoutes);

module.exports = router;