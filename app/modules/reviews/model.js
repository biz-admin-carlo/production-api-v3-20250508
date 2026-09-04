const mongoose = require('mongoose');

const ANONYMOUS_COMMENT_MAX_LENGTH = 2000;
const VERIFIED_COMMENT_MAX_LENGTH = 5000;
const MAX_REVIEW_IMAGES = 3;

const reviewSchema = new mongoose.Schema({
  bizId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Biz',
    index: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required.'],
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number between 1 and 5.'
    }
  },
  comment: {
    type: String,
    required: [true, 'Comment is required.'],
    trim: true,
    validate: {
      validator: function (value) {
        const max = this.isVerified ? VERIFIED_COMMENT_MAX_LENGTH : ANONYMOUS_COMMENT_MAX_LENGTH;
        return value.length <= max;
      },
      message: 'Comment exceeds the maximum allowed length for this reviewer type.'
    }
  },
  reviewerName: {
    type: String,
    required: [true, 'Reviewer name is required.'],
    trim: true,
    maxlength: 80
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  reviewerEmail: {
    type: String,
    default: null
  },
  reviewerPhone: {
    type: String,
    default: null
  },
  reviewerLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length <= MAX_REVIEW_IMAGES,
      message: `A review can have at most ${MAX_REVIEW_IMAGES} images.`
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  ipHash: {
    type: String,
    default: null
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  moderatedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

reviewSchema.index({ bizId: 1, status: 1, isDeleted: 1, isVerified: -1, createdAt: -1 });
reviewSchema.index({ isDeleted: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

Review.ANONYMOUS_COMMENT_MAX_LENGTH = ANONYMOUS_COMMENT_MAX_LENGTH;
Review.VERIFIED_COMMENT_MAX_LENGTH = VERIFIED_COMMENT_MAX_LENGTH;
Review.MAX_REVIEW_IMAGES = MAX_REVIEW_IMAGES;

module.exports = Review;
