const { loginUser, handleForgotPassword, createUser } = require('./service');

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

module.exports = { login, forgotPassword, register };