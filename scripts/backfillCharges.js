// scripts/backfillCharges.js
require('dotenv').config();
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Customer = require('../app/webhooks/CustomerModel');

// Adjust these timestamps as needed
const START_TIME = '2025-05-27T05:26:00Z';
const END_TIME = '2025-05-30T07:45:00Z';

const backfillCharges = async () => {
  const startTimestamp = Math.floor(new Date(START_TIME).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(END_TIME).getTime() / 1000);

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const charges = await stripe.charges.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
    });

    for (const charge of charges.data) {
      const exists = await Customer.findOne({ 'paymentDetails.chargeId': charge.id });
      if (exists) {
        console.log(`⚠️ Skipped duplicate charge: ${charge.id}`);
        continue;
      }

      const paymentDetails = {
        chargeId: charge.id,
        amount: charge.amount,
        amountCaptured: charge.amount_captured,
        currency: charge.currency,
        paymentMethod: charge.payment_method,
        chargeStatus: charge.status,
        createdTimestamp: charge.created,
        receiptUrl: charge.receipt_url,
        billingDetails: charge.billing_details,
        balanceTransactionId: charge.balance_transaction,
        chargeDescription: charge.description,
        paymentOutcome: charge.outcome,
        paymentIntentId: charge.payment_intent,
        receiptEmail: charge.receipt_email,
        shippingDetails: charge.shipping ? {
          address: charge.shipping.address,
          name: charge.shipping.name
        } : null,
        requestId: null,
        idempotencyKey: null,
        eventType: 'charge.succeeded'
      };

      await new Customer({
        name: charge.billing_details?.name || 'Unknown',
        email: charge.receipt_email,
        paymentDetails
      }).save();

      console.log(`✅ Backfilled charge: ${charge.id}`);
    }

    console.log('🎉 Backfill complete!');
    process.exit();
  } catch (err) {
    console.error('❌ Backfill error:', err.message);
    process.exit(1);
  }
};

backfillCharges();
