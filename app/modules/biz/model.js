const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  alias: String,
  title: String
}, { _id: false });

const coordinatesSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], required: true },
  coordinates: {
    type: [Number],
    required: true
  }
}, { _id: false });

const locationSchema = new mongoose.Schema({
  address1: String,
  address2: String,
  address3: String,
  city: String,
  zip_code: String,
  country: String,
  state: String,
  display_address: [String]
}, { _id: false });

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
});

const bizSchema = new mongoose.Schema({
  alias: String,
  iconUrl: String,       
  description: String,
  name: {
    type: String,
    required: [true, "Business name is required."]
  },
  image_url: String,
  biz_images: [imageSchema],
  is_closed: {
    type: Boolean,
    default: false
  },
  url: String,
  review_count: {
    type: Number,
    default: 0
  },
  categories: [categorySchema],
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  email: String,
  coordinates: coordinatesSchema,
  transactions: [String],
  location: locationSchema,
  phone: String,
  display_phone: String,
  isArchived: {
    type: Boolean,
    default: false
  },
  isArchivedId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  isBizDB: {
    type: Boolean,
    default: true
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId, 
    required: [true, "User ID is required"],
    ref: 'User'
  },
  bizStatus: {
    type: String,
    default: "pending" 
  },
  paymentStatus: {
    type: String,
    default: "pending" 
  },
  subscriptionName: String,
  paymentGateway: String,
  customerEmail: String,
  amountTransacted: Number,
  
  keywords: [String],     
  agentName: String,      
  agentId: String       

}, { timestamps: true });

// ========================================
// EXISTING INDEX (Keep this!)
// ========================================
bizSchema.index({ 'coordinates.coordinates': '2dsphere' });

// ========================================
// NEW INDEXES FOR SEARCH SUGGESTIONS
// ========================================

// Text index for full-text search with weighted fields
// Name is 10x more important than other fields
bizSchema.index({
  name: 'text',
  'categories.title': 'text',
  'location.city': 'text',
  'location.state': 'text',
  'keywords': 'text'
}, {
  weights: {
    name: 10,              // Business name is KING
    'categories.title': 5, // Categories are important
    'location.city': 3,    // City matches
    'location.state': 2,   // State matches
    'keywords': 4          // Keywords
  },
  name: 'search_suggestions_text_index'
});

// Single field indexes for fast regex queries
bizSchema.index({ name: 1 });
bizSchema.index({ 'location.city': 1 });
bizSchema.index({ 'location.state': 1 });
bizSchema.index({ 'categories.title': 1 });

// Compound indexes for filtering active businesses
bizSchema.index({ isArchived: 1, is_closed: 1 });
bizSchema.index({ subscriptionName: 1, isArchived: 1 });

// Index for sorting by rating and reviews
bizSchema.index({ rating: -1, review_count: -1 });

module.exports = mongoose.model('Biz', bizSchema);