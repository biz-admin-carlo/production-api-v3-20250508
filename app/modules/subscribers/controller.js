// app/modules/subscribers/controller.js
const { registerBillingDetails, getBillingDetailsByUser }     = require('./service');
const User                            = require('../users/model');
const AppError                       = require('../../utils/AppError');
const { sendMail, getBillingNotificationHtml }                  = require('../../utils/sendEmailGraph');

const createBillingDetails = async (req, res, next) => {
  try {
    const { userId, email: userEmail } = req.user;   
    const { cardNumber, fullName } = req.body;
    const saved = await registerBillingDetails(userId, req.body);
    const cardLast4 = cardNumber.slice(-4);
    const html = getBillingNotificationHtml({
      fullName,
      referenceId: saved.referenceId,
      submittedAt: saved.createdAt,
      cardLast4
    });

    const superAccounts = await User.find({ userCode: '0' })
    .select('email -_id')
    .lean();

    const superEmails = superAccounts.map(u => u.email);

    // await sendMail({
    //   to: [ userEmail, ...superEmails ],
    //   subject: `🔒 Your Billing Details Added`,
    //   html
    // });

    return res.status(201).json({
      success: true,
      data: {
        referenceId:  saved.referenceId,
        createdAt:    saved.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};


async function fetchBillingDetails(req, res, next) {
  try {
    const userId = req.user.userId;
    const details = await getBillingDetailsByUser(userId);
    if (!details) throw new AppError('No billing info found', 404);
    res.json({ success: true, data: details });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBillingDetails, fetchBillingDetails };
