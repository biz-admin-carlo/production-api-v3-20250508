const User = require('../users/model');
const {
  fetchSubscriptionDetails
} = require('../users/service');
const {
  generateTrackingReference
} = require('../../utils/refUtils');
const { 
  registerBillingDetails, 
  getBillingDetailsByUser,
  savePlanChangeLog
} = require('./service');
const { 
  sendMail, 
  getBillingNotificationHtml,
  getUserPlanChangeEmailHtml,
  getAdminPlanChangeNotificationHtml,
  getUserTerminationEmailHtml,
  getAdminTerminationNotificationHtml
} = require('../../utils/sendEmailGraph');

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

const planUpdates = async (req, res, next) => {
  try {
    const action = String(req.query.action || '').toLowerCase();
    const { userId, email: userEmail } = req.user;

    if (!['change-plan', 'terminate-plan'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use ?action=change-plan or ?action=terminate-plan"
      });
    }

    const { newPlanName, reason } = req.body;
    const subscription = await fetchSubscriptionDetails(userId);
    const currentPlans  = subscription.subscriptions.map(s => s.planName).join(', ');
    const referenceId   = await generateTrackingReference({ userId, action });

    let oldPlan, newPlan, userHtml, adminHtml, userSubject, adminSubject;

    if (action === 'change-plan') {
      if (!newPlanName) {
        return res.status(400).json({ success: false, message: 'newPlanName is required for change-plan.' });
      }

      oldPlan = currentPlans || 'Unknown';
      newPlan = newPlanName;

      const log = await savePlanChangeLog({
        userId,
        oldPlan,
        newPlan,
        reason,
        referenceId
      });

      userHtml  = getUserPlanChangeEmailHtml({
        fullName: subscription.businessOwner,
        oldPlan,
        newPlan,
        referenceId: log.referenceId
      });

      adminHtml = getAdminPlanChangeNotificationHtml({
        fullName: subscription.businessOwner,
        email: userEmail,
        userId,
        oldPlan,
        newPlan,
        reason,
        referenceId: log.referenceId,
        submittedAt: log.createdAt
      });

      userSubject  = `Plan Change Request - Ref #${log.referenceId}`;
      adminSubject = `${subscription.businessOwner} requested a Plan Change - Ref #${log.referenceId}`;

      await sendMail({ to: [userEmail], subject: userSubject, html: userHtml });

      const admins = await User.find({ userCode: { $in: ['0'] } }).select('email').lean();
      const adminEmails = admins.map(u => u.email);
      if (adminEmails.length) {
        await sendMail({ to: adminEmails, subject: adminSubject, html: adminHtml });
      }

      return res.status(201).json({
        success: true,
        message: 'Plan change request logged successfully.',
        referenceId: log.referenceId,
        createdAt: log.createdAt
      });
    }

    oldPlan = 'Termination of Plan';
    newPlan = 'Termination of Plan';

    const log = await savePlanChangeLog({
      userId,
      oldPlan,
      newPlan,
      reason,
      referenceId
    });

    userHtml = getUserTerminationEmailHtml({
      fullName: subscription.businessOwner,
      referenceId: log.referenceId
    });

    adminHtml = getAdminTerminationNotificationHtml({
      fullName: subscription.businessOwner,
      email: userEmail,
      userId,
      reason,
      referenceId: log.referenceId,
      submittedAt: log.createdAt
    });

    userSubject  = `Account Termination Request - Ref #${log.referenceId}`;
    adminSubject = `⚠️ Termination Request from ${subscription.businessOwner} - Ref #${log.referenceId}`;

    await sendMail({ to: [userEmail], subject: userSubject, html: userHtml });

    const admins = await User.find({ userCode: { $in: ['0'] } }).select('email').lean();
    const adminEmails = admins.map(u => u.email);
    if (adminEmails.length) {
      await sendMail({ to: adminEmails, subject: adminSubject, html: adminHtml });
    }

    return res.status(201).json({
      success: true,
      message: 'Termination request logged successfully.',
      referenceId: log.referenceId,
      createdAt: log.createdAt
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { createBillingDetails, fetchBillingDetails, planUpdates };