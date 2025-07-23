const User = require('../users/model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMail, getWelcomeEmailHtml } = require('../../utils/sendEmailGraph');
const { generateRandomPassword } = require('../../utils/generatePassword');
const AppError = require('../../utils/AppError');

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid email or password');

  if (!user.isActive) throw new Error('Account is inactive');

  const payload = {
    userId: user._id,
    userCode: user.userCode || 11,
    userFirstName: user.firstName,
    userLastName: user.lastName,
    status: user.isActive,
    email: user.email
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET); // no expiry
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET); // no expiry  

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      userCode: user.userCode || 11,
      status: user.isActive
    }
  };
};

const handleForgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user) return;

  const newPassword = generateRandomPassword();
  const hashed = await bcrypt.hash(newPassword, 10);

  user.password = hashed;
  await user.save();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; color: #0f0f0f;">
      <h2 style="font-size: 22px; font-weight: 600;">We noticed a password reset request for your account</h2>

      <p style="margin-top: 20px;">Hi ${user.firstName},</p>

      <p>We received a request to reset the password associated with <strong>${user.email}</strong>.</p>

      <p>If this was you, here is your new system-generated password:</p>

      <div style="margin: 20px 0; padding: 16px; background: #f3f4f6; border-radius: 8px; font-size: 18px; font-weight: bold; text-align: center;">
        ${newPassword}
      </div>

      <p>If you didn’t request this reset, you can ignore this email or 
        <a href="mailto:bizsolutionssupport@bizsolutions.us?subject=Password Reset Concern&body=I did not request a password reset for my account (${user.email}). Please investigate." style="color: #1a73e8; text-decoration: underline;">
          report it
        </a> 
        to our support team.
      </p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="font-size: 12px; color: #6b7280;">This email was sent from <strong>BizSolutions LLC</strong>. If you have any questions, feel free to contact us at <a href="mailto:bizsolutionssupport@bizsolutions.us">bizsolutionssupport@bizsolutions.us</a>.</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'New password',
    html
  });
};

const createUser = async (data) => {
  const {
    firstName,
    lastName,
    email,
    password,
    birthday,
    userCode    = '11',
    referredBy  = null
  } = data;

  if (!firstName || !lastName || !email || !password) {
    throw new AppError('Missing required fields', 400);
  }

  if (await User.exists({ email })) {
    throw new AppError('Email is already in use', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const birth = birthday ? new Date(birthday) : new Date();
  const month = String(birth.getMonth() + 1).padStart(2, '0');
  const day   = String(birth.getDate()).padStart(2, '0');
  const referralCode = `${firstName.toUpperCase()}-BIZ-${month}-${day}`;
  
  const user = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    birthday,
    userCode,
    referralCode,
    referredBy
  });
  await user.save();

  const activationLink = `https://mybizsolutions.us/login`;
  const welcomeHtml    = getWelcomeEmailHtml(user, activationLink);
  await sendMail({
    to: [user.email],
    subject: 'Welcome to MyBizSolutions!',
    html: welcomeHtml
  });

  const superAdmins = await User.find({ userCode: '0' })
                                .select('email firstName lastName')
                                .lean();
  const adminEmails = superAdmins.map(u => u.email);
  if (adminEmails.length) {

    const adminHtml = `
      <p>Hello Admin,</p>
      <p>A new user has just registered:</p>
      <ul>
        <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Referral Code:</strong> ${user.referralCode}</li>
      </ul>
      <p>You can review them in the <a href="https://mybizsolutions.us/portal/team">admin portal</a>.</p>
    `;
    await sendMail({
      to: adminEmails,
      subject: '🔔 New user registration',
      html: adminHtml
    });
  }

  return {
    id:           user._id,
    fullName:     user.fullName,
    email:        user.email,
    userCode:     user.userCode,
    referralCode: user.referralCode,
    isActive:     user.isActive,
    createdAt:    user.createdAt
  };
};

module.exports = { loginUser, handleForgotPassword, createUser };