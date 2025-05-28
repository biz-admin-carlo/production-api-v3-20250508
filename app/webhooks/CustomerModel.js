const mongoose = require('mongoose');

const billingDetailsSchema = new mongoose.Schema({
    address: {
        city: String,
        country: String,
        line1: String,
        line2: String,
        postal_code: String,
        state: String
    },
    email: String,
    name: String,
    phone: String
});

const paymentOutcomeSchema = new mongoose.Schema({
    network_status: String,
    reason: String,
    risk_level: String,
    risk_score: Number,
    seller_message: String,
    type: String
});

const shippingDetailsSchema = new mongoose.Schema({
    address: {
        city: String,
        country: String,
        line1: String,
        line2: String,
        postal_code: String,
        state: String
    },
    name: String
});

const paymentDetailsSchema = new mongoose.Schema({
    chargeId: String,
    amount: Number,
    amountCaptured: Number,
    currency: String,
    paymentMethod: String,
    chargeStatus: String,
    createdTimestamp: Number,
    receiptUrl: String,
    billingDetails: billingDetailsSchema,
    balanceTransactionId: String,
    chargeDescription: String,
    paymentOutcome: paymentOutcomeSchema,
    paymentIntentId: String,
    receiptEmail: String,
    shippingDetails: shippingDetailsSchema,
    requestId: String,
    idempotencyKey: String,
    eventType: String
});

const CustomerModel = new mongoose.Schema({
    name: String,
    email: String,

    paymentDetails: paymentDetailsSchema
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerModel);
