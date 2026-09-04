const {
  loginUser,
  loginWithGoogle,
  handleForgotPassword,
  createUser,
  createSubscriber
} = require('./service');
const prisma = require('../../../prisma/client');
const User = require('../users/model');
const bcrypt = require('bcryptjs');
const AppError = require('../../utils/AppError');

// const login = async (req, res, next) => {
//   const { loginMeta } = res.locals;

//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       await prisma.LoginDetails.create({
//         data: {
//           ...loginMeta,
//           status: 'failed'
//         }
//       });
      
//       return res.status(400).json({
//         success: false,
//         message: 'Email and password are required'
//       });
//     }

//     const data = await loginUser({ email, password });

//     await prisma.LoginDetails.create({
//       data: {
//         ...loginMeta,
//         status: 'success'
//       }
//     });

//     return res.status(200).json({
//       success: true,
//       data
//     });
//   } catch (err) {
//     console.error('❌ Login failed:', err.message);
//     await prisma.LoginDetails.create({
//       data: {
//         ...res.locals.loginMeta,
//         status: 'failed'
//       }
//     });

//     return res.status(403).json({
//       success: false,
//       message: err.message
//     });

//   }
// };

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const data = await loginUser({ email, password });

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    return res.status(403).json({ success: false, message: err.message });
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }

    const data = await loginWithGoogle({ idToken });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    await handleForgotPassword(email);

    return res.status(200).json({
      success: true,
      message: 'If your email exists, a new password has been sent'
    });
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const user = await createUser(req.body);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const registerSubsriber = async (req, res, next) => {
  try {
    const user = await createSubscriber(req.body);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const getSubscriberByEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.params.email })
      .select('firstName lastName email userCode birthday isActive createdAt');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

const updateSubscriber = async (req, res, next) => {
  try {
    const { firstName, lastName, password, userCode } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (userCode !== undefined) user.userCode = userCode;
    
    // Update password if provided
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userCode: user.userCode
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  googleLogin,
  forgotPassword,
  register,
  registerSubsriber,
  getSubscriberByEmail,
  updateSubscriber
};