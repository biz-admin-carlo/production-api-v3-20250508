const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const socketManager = require('../utils/socketManager');

const Customer = require('./CustomerModel');
const Dispute = require('./DisputeModel');

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const io = socketManager.getIO();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'charge.succeeded':
      const paymentData = event.data.object;

      const paymentInfo = {
        chargeId: paymentData.id,
        amount: paymentData.amount,
        amountCaptured: paymentData.amount_captured,
        currency: paymentData.currency,
        paymentMethod: paymentData.payment_method,
        chargeStatus: paymentData.status,
        createdTimestamp: paymentData.created,
        receiptUrl: paymentData.receipt_url,
        billingDetails: paymentData.billing_details,
        balanceTransactionId: paymentData.balance_transaction,
        chargeDescription: paymentData.description,
        paymentOutcome: paymentData.outcome,
        paymentIntentId: paymentData.payment_intent,
        receiptEmail: paymentData.receipt_email,
        shippingDetails: paymentData.shipping ? {
          address: paymentData.shipping.address,
          name: paymentData.shipping.name
        } : null,
        requestId: req.body.request?.id,
        idempotencyKey: req.body.request?.idempotency_key,
        eventType: event.type
      };

      // Emit via WebSocket
      io.emit('payment-success', paymentInfo);

      // Save to DB
      await new Customer({
        name: paymentData.billing_details?.name || 'Unknown',
        email: paymentData.receipt_email,
        paymentDetails: paymentInfo
      }).save();

      return res.status(200).send('Charge success received');

    case 'charge.dispute.created':
      const dispute = event.data.object;

      const disputeInfo = {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        customerEmail: dispute.billing_details?.email || 'unknown@domain.com',
        amount: dispute.amount,
        reason: dispute.reason || null,
        status: dispute.status,
        created: dispute.created,
        charge: dispute.charge,
        eventType: event.type
      };

      io.emit('dispute-created', disputeInfo);

      await new Dispute(disputeInfo).save();

      return res.status(200).send('Dispute created received');

    default:
      console.log(`Unhandled event type: ${event.type}`);
      return res.status(200).send('Event received');
  }
});

module.exports = router;
