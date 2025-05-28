const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  typeOfTransaction: { type: Number, enum: [111], required: true }, 
  userType: { type: Number, enum: [0, 21, 22], required: true },
  isSeen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  referredBy: { type: String },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Biz' },
  businessName: { type: String }
});

module.exports = mongoose.model('Notification', notificationSchema);