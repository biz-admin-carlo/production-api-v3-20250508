const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First Name is required.']
  },
  lastName: {
    type: String,
    required: [true, 'Last Name is required.']
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email format'],
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required.']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  birthday: {
    type: String,
    required: [true, 'Birthday is required.']
  },
  referralCode: {
    type: String,
    default: null
  },
  referredBy: {
    type: String,
    default: null 
  },
  userCode: {
    type: String,
    enum: ['0', '11', '12', '21', '22', '31'],
    default: '11',
    required: true
  }  
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'lastModifiedAt'
  }
});

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.index({ userCode: 1 });

module.exports = mongoose.model('User', userSchema);
