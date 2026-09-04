const mongoose = require('mongoose');
const Review = require('./model');
const Biz = require('../biz/model');
const User = require('../users/model');
const AppError = require('../../utils/AppError');
const { sendMail, getNewReviewNotificationHtml } = require('../../utils/sendEmailGraph');

const notifyBizOwnerOfNewReview = async (review, biz) => {
  if (!biz.userID) return;

  const owner = await User.findById(biz.userID).select('email').lean();
  if (!owner?.email) return;

  await sendMail({
    to: [owner.email],
    subject: `New Review for ${biz.name}`,
    html: getNewReviewNotificationHtml({
      bizName: biz.name,
      reviewerName: review.reviewerName,
      rating: review.rating,
      comment: review.comment,
      isVerified: review.isVerified,
      portalLink: 'https://mybizsolutions.us/login'
    })
  });
};

const createReview = async ({ bizId, rating, comment, reviewerName, ipHash, userId, images, clientLocation }) => {
  if (!mongoose.Types.ObjectId.isValid(bizId)) {
    throw new AppError('Invalid business id', 400);
  }

  const biz = await Biz.findById(bizId).select('_id name userID').lean();
  if (!biz) {
    throw new AppError('Business not found', 404);
  }

  const parsedRating = Number(rating);
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    throw new AppError('Rating must be a whole number between 1 and 5.', 400);
  }

  if (typeof comment !== 'string' || !comment.trim()) {
    throw new AppError('Comment is required.', 400);
  }

  let isVerified = false;
  let verifiedUserId = null;
  let finalReviewerName = reviewerName;
  let reviewerEmail = null;
  let reviewerPhone = null;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const account = await User.findById(userId).select('firstName lastName email contactNumber').lean();
    if (account) {
      verifiedUserId = userId;
      isVerified = true;
      reviewerEmail = account.email || null;
      reviewerPhone = account.contactNumber || null;

      const hasCustomName = typeof reviewerName === 'string' && reviewerName.trim();
      finalReviewerName = hasCustomName
        ? reviewerName.trim()
        : `${account.firstName} ${account.lastName}`.trim();
    }
  }

  const reviewerLocation = clientLocation
    && clientLocation.latitude != null && clientLocation.longitude != null
    ? { latitude: clientLocation.latitude, longitude: clientLocation.longitude }
    : { latitude: null, longitude: null };

  if (typeof finalReviewerName !== 'string' || !finalReviewerName.trim()) {
    throw new AppError('Reviewer name is required.', 400);
  }

  const commentMaxLength = isVerified
    ? Review.VERIFIED_COMMENT_MAX_LENGTH
    : Review.ANONYMOUS_COMMENT_MAX_LENGTH;
  if (comment.trim().length > commentMaxLength) {
    throw new AppError(`Comment must be ${commentMaxLength} characters or fewer.`, 400);
  }

  // Images require a verified (logged-in) reviewer — an anonymous request
  // can't have gotten upload URLs in the first place, so anything sent
  // here without verification is dropped rather than trusted.
  let finalImages = [];
  if (isVerified && Array.isArray(images)) {
    finalImages = images.filter((url) => typeof url === 'string' && url.trim());
    if (finalImages.length > Review.MAX_REVIEW_IMAGES) {
      throw new AppError(`A review can have at most ${Review.MAX_REVIEW_IMAGES} images.`, 400);
    }
  }

  const review = new Review({
    bizId,
    rating: parsedRating,
    comment: comment.trim(),
    reviewerName: finalReviewerName.trim(),
    userId: verifiedUserId,
    isVerified,
    reviewerEmail,
    reviewerPhone,
    reviewerLocation,
    images: finalImages,
    ipHash: ipHash || null,
    status: 'pending'
  });

  await review.save();

  notifyBizOwnerOfNewReview(review, biz).catch((err) => {
    console.error('❌ Failed to send new review notification email:', err);
  });

  return review;
};

const listApprovedReviews = async (bizId, { page = 1, limit = 20 } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(bizId)) {
    throw new AppError('Invalid business id', 400);
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

  const [reviews, total] = await Promise.all([
    Review.find({ bizId, status: 'approved', isDeleted: false })
      .select('bizId rating comment reviewerName isVerified images status createdAt updatedAt')
      .sort({ isVerified: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments({ bizId, status: 'approved', isDeleted: false })
  ]);

  return { reviews, total, page: Number(page), limit: Number(limit) };
};

const listPendingReviews = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

  const [reviews, total] = await Promise.all([
    Review.find({ status: 'pending', isDeleted: false })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments({ status: 'pending', isDeleted: false })
  ]);

  return { reviews, total, page: Number(page), limit: Number(limit) };
};

const listAllReviews = async ({ status, bizId, includeDeleted = false, page = 1, limit = 20 } = {}) => {
  const filter = {};

  if (status) {
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new AppError("status must be one of 'pending', 'approved', 'rejected'", 400);
    }
    filter.status = status;
  }

  if (bizId) {
    if (!mongoose.Types.ObjectId.isValid(bizId)) {
      throw new AppError('Invalid business id', 400);
    }
    filter.bizId = bizId;
  }

  if (!includeDeleted || includeDeleted === 'false') {
    filter.isDeleted = false;
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('bizId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments(filter)
  ]);

  return { reviews, total, page: Number(page), limit: Number(limit) };
};

const recomputeBizRating = async (bizId) => {
  const [stats] = await Review.aggregate([
    { $match: { bizId: new mongoose.Types.ObjectId(bizId), status: 'approved', isDeleted: false } },
    { $group: { _id: '$bizId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);

  await Biz.findByIdAndUpdate(bizId, {
    rating: stats ? Math.round(stats.avgRating * 10) / 10 : 0,
    review_count: stats ? stats.count : 0
  });
};

const updateReviewStatus = async (reviewId, status, adminUser) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new AppError('Invalid review id', 400);
  }

  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError("status must be 'approved' or 'rejected'", 400);
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  review.status = status;
  review.moderatedBy = adminUser?.userId || null;
  review.moderatedAt = new Date();
  await review.save();

  if (status === 'approved') {
    await recomputeBizRating(review.bizId);
  }

  return review;
};

const deleteReview = async (reviewId, adminUser) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new AppError('Invalid review id', 400);
  }

  const review = await Review.findById(reviewId);
  if (!review || review.isDeleted) {
    throw new AppError('Review not found', 404);
  }

  const wasApproved = review.status === 'approved';

  review.isDeleted = true;
  review.deletedBy = adminUser?.userId || null;
  review.deletedAt = new Date();
  await review.save();

  if (wasApproved) {
    await recomputeBizRating(review.bizId);
  }

  return review;
};

const editReview = async (reviewId, { comment, reviewerName }) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new AppError('Invalid review id', 400);
  }

  if (comment === undefined && reviewerName === undefined) {
    throw new AppError('Nothing to update — provide comment and/or reviewerName.', 400);
  }

  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  if (!review) {
    throw new AppError('Review not found', 404);
  }

  if (comment !== undefined) {
    if (typeof comment !== 'string' || !comment.trim()) {
      throw new AppError('Comment must be a non-empty string.', 400);
    }
    review.comment = comment.trim();
  }

  if (reviewerName !== undefined) {
    if (typeof reviewerName !== 'string' || !reviewerName.trim()) {
      throw new AppError('Reviewer name must be a non-empty string.', 400);
    }
    review.reviewerName = reviewerName.trim();
  }

  await review.save();
  return review;
};

module.exports = {
  createReview,
  listApprovedReviews,
  listPendingReviews,
  listAllReviews,
  updateReviewStatus,
  deleteReview,
  editReview
};
