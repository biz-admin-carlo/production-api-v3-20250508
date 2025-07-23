const express = require('express');
const { 
    getAllLogs,
    getLogLocations,
    getBizCategoryLogs
} = require('./controller');
const internalMiddleware = require('../../middlewares/internalMiddleware');

const router = express.Router();

router.get('/', internalMiddleware, getAllLogs);
router.get('/locations/', internalMiddleware, getLogLocations);
router.get('/biz-category/', internalMiddleware, getBizCategoryLogs);

module.exports = router;