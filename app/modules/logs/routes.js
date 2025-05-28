const express = require('express');
const { getAllLogs } = require('./controller');
const internalMiddleware = require('../../middlewares/internalMiddleware');

const router = express.Router();

router.get('/', internalMiddleware, getAllLogs);

module.exports = router;