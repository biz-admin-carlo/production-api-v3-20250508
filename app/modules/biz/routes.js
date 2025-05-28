const express = require('express');
const router = express.Router();
const { generalLimiter } = require('../../middlewares/rateLimiter');
const { searchByLocation, searchByGeoCoordinates, getBizByName, getFeaturedBiz } = require('./controller');

router.get('/retrieve-featured/', generalLimiter, getFeaturedBiz);
router.get('/category/location', generalLimiter, searchByLocation);
router.get('/category/:latitude/:longitude', generalLimiter, searchByGeoCoordinates);
router.get('/:bizName', generalLimiter, getBizByName);

module.exports = router;
