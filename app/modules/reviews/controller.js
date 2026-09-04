const crypto = require('crypto');
const {
  createReview,
  listApprovedReviews,
  listPendingReviews,
  listAllReviews,
  updateReviewStatus,
  deleteReview,
  editReview
} = require('./service');

const hashIp = (ip) => {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
};

const postReview = async (req, res, next) => {
  try {
    const { bizId } = req.params;
    const { rating, comment, reviewerName, images } = req.body;

    const review = await createReview({
      bizId,
      rating,
      comment,
      reviewerName,
      images,
      ipHash: hashIp(req.ip),
      userId: req.user?.userId,
      clientLocation: req.clientLocation
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted and pending approval.',
      data: review
    });
  } catch (err) {
    next(err);
  }
};

const postReviewImages = async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ success: false, message: 'At least one image is required.' });
    }

    const imageUrls = req.files.map((file) => file.location);
    res.status(200).json({ success: true, data: { images: imageUrls } });
  } catch (err) {
    next(err);
  }
};

const getApprovedReviews = async (req, res, next) => {
  try {
    const { bizId } = req.params;
    const { page, limit } = req.query;

    const result = await listApprovedReviews(bizId, { page, limit });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getPendingReviews = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await listPendingReviews({ page, limit });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const patchReviewStatus = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body;

    const review = await updateReviewStatus(reviewId, status, req.user);

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

const getAllReviews = async (req, res, next) => {
  try {
    const { status, bizId, includeDeleted, page, limit } = req.query;
    const result = await listAllReviews({ status, bizId, includeDeleted, page, limit });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const deleteReviewById = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = await deleteReview(reviewId, req.user);

    res.status(200).json({ success: true, message: 'Review deleted.', data: review });
  } catch (err) {
    next(err);
  }
};

const patchReviewEdit = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { comment, reviewerName } = req.body;

    const review = await editReview(reviewId, { comment, reviewerName });

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  postReview,
  postReviewImages,
  getApprovedReviews,
  getPendingReviews,
  patchReviewStatus,
  getAllReviews,
  deleteReviewById,
  patchReviewEdit
};
