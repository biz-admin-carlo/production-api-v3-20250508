const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  method: String,
  url: String,
  status: Number,
  responseTime: Number,
  ip: String,
  userAgent: String,
  machineName: String,
  macAddress: String,
  latitude: Number,
  longitude: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Log', logSchema);
