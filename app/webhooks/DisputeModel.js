// app/models/Dispute.js
const mongoose = require('mongoose');

const DisputeModel = new mongoose.Schema({
  disputeId: {
    type: String,
    required: true,
    unique: true
  },
  chargeId: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: false
  },
  status: {
    type: String,
    required: true
  },
  created: {
    type: Number,
    required: true
  },
  charge: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    default: 'charge.dispute.created'
  }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', DisputeModel);
