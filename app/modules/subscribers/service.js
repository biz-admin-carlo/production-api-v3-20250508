const prisma = require('../../../lib/prisma');
const { encryptRSA } = require('../../utils/cryptoUtils');

async function registerBillingDetails(userId, input) {
  const {
    email,
    phone,
    cardNumber,
    expirationDate,
    cvc,
    country,
    address,
    fullName
  } = input;

  const maskedCardNumber     = '**** **** **** ' + cardNumber.slice(-4);
  const maskedExpirationYear = expirationDate.split('/')[1];

  const record = await prisma.subscriberPaymentInfo.create({
    data: {
      userId,
      email,
      phone,
      country,
      address,
      fullName,
      cvcEncrypted        : encryptRSA(cvc),
      expirationEncrypted : encryptRSA(expirationDate),
      cardEncrypted       : encryptRSA(cardNumber),
      maskedCardNumber,
      maskedExpirationYear
    }
  });
  return record;
}

async function getBillingDetailsByUser(userId) {
  return prisma.subscriberPaymentInfo.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      email: true,
      phone: true,
      country: true,
      address: true,
      maskedCardNumber: true,
      maskedExpirationYear: true,
      createdAt: true,
      fullName: true,
    },
  });
}

async function getAllBillingDetails() {
  return prisma.subscriberPaymentInfo.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      userId: true,
      email: true,
      phone: true,
      country: true,
      address: true,
      fullName: true,
      maskedCardNumber: true,
      maskedExpirationYear: true,
      createdAt: true,
    },
  });
}

async function getLatestBillingDetailsPerUser() {
  // 1) Group to get max createdAt per user
  const grouped = await prisma.subscriberPaymentInfo.groupBy({
    by: ['userId'],
    _max: { createdAt: true },
  });

  // 2) Fetch the actual rows that match each (userId, createdAt max)
  // Build OR filters
  const ors = grouped.map(g => ({
    userId_createdAt: { userId: g.userId, createdAt: g._max.createdAt },
  }));

  if (!ors.length) return [];

  const latestRows = await prisma.subscriberPaymentInfo.findMany({
    where: { OR: ors.map(({ userId_createdAt }) => ({
      userId: userId_createdAt.userId,
      createdAt: userId_createdAt.createdAt,
    }))},
    select: {
      userId: true,
      email: true,
      phone: true,
      country: true,
      address: true,
      fullName: true,
      maskedCardNumber: true,
      maskedExpirationYear: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return latestRows;
}

async function savePlanChangeLog({ userId, oldPlan, newPlan, reason, referenceId }) {
  return await prisma.planChangeLog.create({
    data: {
      userId,
      oldPlan,
      newPlan,
      reason,
      referenceId,
    },
  });
}

module.exports = {
  registerBillingDetails,
  getBillingDetailsByUser,
  getAllBillingDetails,
  getLatestBillingDetailsPerUser,
  savePlanChangeLog,
};
