const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, 
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.'
  }
});

module.exports = { generalLimiter, loginLimiter };
