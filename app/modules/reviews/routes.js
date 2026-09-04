const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/authMiddleware');
const internalMiddleware = require('../../middlewares/internalMiddleware');
const optionalAuthMiddleware = require('../../middlewares/optionalAuthMiddleware');
const { generalLimiter, reviewLimiter } = require('../../middlewares/rateLimiter');
const { uploadReviewImages } = require('../../utils/s3Uploader');
const {
  postReview,
  postReviewImages,
  getApprovedReviews,
  getPendingReviews,
  patchReviewStatus,
  getAllReviews,
  deleteReviewById,
  patchReviewEdit
} = require('./controller');

router.get('/', internalMiddleware, getAllReviews);
router.get('/pending', internalMiddleware, getPendingReviews);
router.patch('/:reviewId/status', internalMiddleware, patchReviewStatus);
router.patch('/:reviewId', internalMiddleware, patchReviewEdit);
router.delete('/:reviewId', internalMiddleware, deleteReviewById);

router.post('/:bizId/images', authMiddleware, reviewLimiter, uploadReviewImages, postReviewImages);
router.post('/:bizId', optionalAuthMiddleware, reviewLimiter, postReview);
router.get('/:bizId', generalLimiter, getApprovedReviews);

module.exports = router;
