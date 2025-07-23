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

    await sendMail({
      to: [ userEmail ],
      subject: `Successful Billing Details Added`,
      html
    });

    const superUsers = await User
    .find({ userCode: { $in: ['0','22'] } })
    .select('email')
    .lean();
  
    const superEmails = superUsers.map(u => u.email);

    if (superEmails.length) {
      const adminHtml = getBillingNotificationHtml({
        fullName,
        referenceId: saved.referenceId,
        submittedAt: saved.createdAt,
        cardLast4
      });
      await sendMail({
        to: superEmails,
        subject: `${fullName} Added/Updated Billing Details`,
        html: adminHtml
      });
    }

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

const fetchBillingDetails = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: missing userId from token.',
      });
    }

    const details = await getBillingDetailsByUser(userId);

    if (!details) {
      return res.status(200).json({
        success: true,
        hasBilling: false,
        data: null,
        message: 'No billing details saved yet.',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      hasBilling: true,
      data: details,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err); // still bubble unexpected errors to your global handler
  }
}

module.exports = { createBillingDetails, fetchBillingDetails };