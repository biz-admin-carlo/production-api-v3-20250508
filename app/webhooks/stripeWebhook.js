'use strict';

const express = require('express');
const router  = express.Router();
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const socketManager = require('../utils/socketManager');

const User = require('../modules/users/model');
const {
  sendMail,
  getPaymentSuccessHtml,
  getDisputeNotificationHtml,
} = require('../utils/sendEmailGraph');

const Customer = require('./CustomerModel');
const Dispute  = require('./DisputeModel');

async function getSuperAdminEmails() {
  const rows = await User.find({ userCode: '0' }).select('email').lean();
  return rows.map(r => r.email).filter(Boolean);
}

async function notifySuperAdminsPayment({
  fullName,
  chargeId,
  amountMinor,
  currency,
  createdAtMs,
  receiptUrl,
  cardLast4,
  cardBrand,
}) {
  const superEmails = await getSuperAdminEmails();
  if (!superEmails.length) {
    console.warn('notifySuperAdminsPayment: no super-admin emails found.');
    return;
  }

  const html = getPaymentSuccessHtml({
    fullName,
    chargeId,
    amountMinor,
    currency,
    createdAt: createdAtMs,
    receiptUrl,
    cardLast4,
    cardBrand,
  });

  await sendMail({
    to: superEmails,
    subject: `PAYMENT: ${fullName} (${chargeId})`,
    html,
  });
}

async function notifySuperAdminsDispute({
  fullName,
  email,
  disputeId,
  chargeId,
  amountMinor,
  currency,
  reason,
  status,
  createdAtMs,
  dueByMs,
  cardLast4,
  cardBrand,
}) {
  const superEmails = await getSuperAdminEmails();
  if (!superEmails.length) {
    console.warn('notifySuperAdminsDispute: no super-admin emails found.');
    return;
  }

  const html = getDisputeNotificationHtml({
    fullName,
    email,
    disputeId,
    chargeId,
    amountMinor,
    currency,
    reason,
    status,
    createdAt: createdAtMs,
    dueBy: dueByMs,
    cardLast4,
    cardBrand,
  });

  await sendMail({
    to: superEmails,
    subject: `DISPUTE: ${disputeId} (${chargeId})`,
    html,
  });
}

function extractChargeCardMeta(chargeObj) {
  const pm   = chargeObj.payment_method_details || {};
  const card = pm.card || {};
  return {
    last4 : card.last4 || '----',
    brand : card.brand || 'card',
    name  : chargeObj.billing_details?.name || 'Unknown',
  };
}

function parseDisputeCore(dispute) {
  return {
    disputeId : dispute.id,
    chargeId  : dispute.charge,
    amount    : dispute.amount,
    currency  : dispute.currency,
    reason    : dispute.reason,
    status    : dispute.status,
    created   : dispute.created,
    dueBy     : dispute.evidence_details?.due_by || null,
    email     : dispute.evidence?.customer_email_address
             || dispute.metadata?.customer_email
             || null,
    fullName  : dispute.evidence?.customer_name
             || dispute.metadata?.customer_name
             || null,
  };
}

router.post('/', async (req, res) => {
  const sig            = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const io             = socketManager.getIO();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  let postAckWork = null;

  switch (event.type) {
    case 'charge.succeeded': {
      const paymentData = event.data.object;

      const paymentInfo = {
        chargeId          : paymentData.id,
        amount            : paymentData.amount,
        amountCaptured    : paymentData.amount_captured,
        currency          : paymentData.currency,
        paymentMethod     : paymentData.payment_method,
        chargeStatus      : paymentData.status,
        createdTimestamp  : paymentData.created,  
        receiptUrl        : paymentData.receipt_url,
        billingDetails    : paymentData.billing_details,
        balanceTransactionId: paymentData.balance_transaction,
        chargeDescription : paymentData.description,
        paymentOutcome    : paymentData.outcome,
        paymentIntentId   : paymentData.payment_intent,
        receiptEmail      : paymentData.receipt_email,
        shippingDetails   : paymentData.shipping ? {
          address: paymentData.shipping.address,
          name   : paymentData.shipping.name,
        } : null,
        requestId         : req.body.request?.id,
        idempotencyKey    : req.body.request?.idempotency_key,
        eventType         : event.type,
      };

      postAckWork = (async () => {
        try {
          const existing = await Customer.findOne({ 'paymentDetails.chargeId': paymentData.id });

          if (!existing) {
            await new Customer({
              name: paymentData.billing_details?.name || 'Unknown',
              email: paymentData.receipt_email,
              paymentDetails: paymentInfo
            }).save();
          } else {
            console.log(`⚠️ Duplicate charge skipped: ${paymentData.id}`);
          }

          // Emit socket
          io.emit('payment-success', paymentInfo);

          // Admin email
          const meta = extractChargeCardMeta(paymentData);
          await notifySuperAdminsPayment({
            fullName    : meta.name,
            chargeId    : paymentData.id,
            amountMinor : paymentData.amount,
            currency    : paymentData.currency,
            createdAtMs : paymentData.created * 1000,
            receiptUrl  : paymentData.receipt_url,
            cardLast4   : meta.last4,
            cardBrand   : meta.brand,
          });
        } catch (err) {
          console.error('⚠️ postAckWork (charge.succeeded) failure:', err);
        }
      })();

      return res.status(200).send('Charge success received');
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object;
      const core    = parseDisputeCore(dispute);

      const disputeInfo = {
        disputeId     : core.disputeId,
        chargeId      : core.chargeId,
        customerEmail : core.email || 'unknown@domain.com',
        amount        : core.amount,
        reason        : core.reason || null,
        status        : core.status,
        created       : core.created,
        charge        : core.chargeId,
        eventType     : event.type,
      };

      postAckWork = (async () => {
        try {
          io.emit('dispute-created', disputeInfo);
          await new Dispute(disputeInfo).save();

          let cardLast4 = '----';
          let cardBrand = 'card';
          let fullName  = core.fullName || 'Unknown';
          let email     = disputeInfo.customerEmail;

          try {
            const charge = await stripe.charges.retrieve(core.chargeId);
            const meta   = extractChargeCardMeta(charge);
            cardLast4    = meta.last4;
            cardBrand    = meta.brand;
            if (fullName === 'Unknown') fullName = meta.name;
            if (!email) {
              email = charge.billing_details?.email || charge.receipt_email || email;
            }
          } catch (err) {
            console.warn(`⚠️ Could not retrieve charge ${core.chargeId} for dispute email:`, err.message);
          }

          await notifySuperAdminsDispute({
            fullName,
            email,
            disputeId  : core.disputeId,
            chargeId   : core.chargeId,
            amountMinor: core.amount,
            currency   : core.currency,
            reason     : core.reason,
            status     : core.status,
            createdAtMs: core.created * 1000,
            dueByMs    : core.dueBy ? core.dueBy * 1000 : undefined,
            cardLast4,
            cardBrand,
          });
        } catch (err) {
          console.error('⚠️ postAckWork (dispute.created) failure:', err);
        }
      })();

      return res.status(200).send('Dispute created received');
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
      return res.status(200).send('Event received');
  }
});

module.exports = router;
