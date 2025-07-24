const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const { generalLimiter } = require('../../middlewares/rateLimiter');
const { uploadSingle, uploadMultiple } = require("../../utils/s3Uploader");
const { 
    searchByLocation, 
    searchByGeoCoordinates, 
    getBizByName, 
    getFeaturedBiz, 
    createBizDetails,
    handleBizIconUpload,
    handleBizGalleryUpload,
    getBizDetails
} = require('./controller');

router.get('/retrieve-featured/', generalLimiter, getFeaturedBiz);
router.get('/category/location', generalLimiter, searchByLocation);
router.get('/category/:latitude/:longitude', generalLimiter, searchByGeoCoordinates);
router.get('/:bizName', generalLimiter, getBizByName);
router.get('/', authMiddleware, getBizDetails)

router.post('/details/', generalLimiter, createBizDetails);
router.post("/biz-icon", generalLimiter, uploadSingle, handleBizIconUpload);
router.post("/biz-gallery", generalLimiter, uploadMultiple, handleBizGalleryUpload);

module.exports = router;