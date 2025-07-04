const express = require('express');
const router = express.Router();
const { generalLimiter } = require('../../middlewares/rateLimiter');
const { searchByLocation, searchByGeoCoordinates, getBizByName, getFeaturedBiz, createBizDetails } = require('./controller');

router.get('/retrieve-featured/', generalLimiter, getFeaturedBiz);
router.get('/category/location', generalLimiter, searchByLocation);
router.get('/category/:latitude/:longitude', generalLimiter, searchByGeoCoordinates);
router.get('/:bizName', generalLimiter, getBizByName);

router.post('/details/', generalLimiter, createBizDetails);
  
module.exports = router;
