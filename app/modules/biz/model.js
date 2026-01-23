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

bizSchema.index({ 'coordinates.coordinates': '2dsphere' });

bizSchema.index({
  name: 'text',
  'categories.title': 'text',
  'location.city': 'text',
  'location.state': 'text',
  'keywords': 'text'
}, {
  weights: {
    name: 10,              
    'categories.title': 5,
    'location.city': 3,    
    'location.state': 2,   
    'keywords': 4       
  },
  name: 'search_suggestions_text_index'
});

bizSchema.index({ name: 1 });
bizSchema.index({ 'location.city': 1 });
bizSchema.index({ 'location.state': 1 });
bizSchema.index({ 'categories.title': 1 });

bizSchema.index({ isArchived: 1, is_closed: 1 });
bizSchema.index({ subscriptionName: 1, isArchived: 1 });

bizSchema.index({ rating: -1, review_count: -1 });

bizSchema.index({ email: 1 });
bizSchema.index({ createdAt: -1 });
bizSchema.index({ bizStatus: 1 });
bizSchema.index({ bizStatus: 1, createdAt: -1 });
bizSchema.index({ email: 1, bizStatus: 1 });

module.exports = mongoose.model('Biz', bizSchema);