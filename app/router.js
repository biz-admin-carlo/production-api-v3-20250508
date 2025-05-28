const express = require('express');
const router = express.Router();

const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const bizRoutes = require('./modules/biz/routes');
const accountRoutes = require('./modules/accounts/routes');
const internalRoutes = require('./modules/internal/routes');
const logsRoutes = require('./modules/logs/routes');
const notificationRoutes = require('./modules/notifications/routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/biz', bizRoutes);
router.use('/accounts', accountRoutes);
router.use('/internal', internalRoutes);
router.use('/logs', logsRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;