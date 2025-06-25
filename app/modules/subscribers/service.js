const prisma = require('../../../lib/prisma');
const { encryptRSA } = require('../../utils/cryptoUtils');

async function registerBillingDetails(userId, input) {
  const {
    email,
    phone,
    cardNumber,
    expirationDate, // e.g. "08/2025"
    cvc,
    country,
    address,
    fullName
  } = input;

  // mask only last 4 digits
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
  const [latest] = await prisma.subscriberPaymentInfo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      email: true,
      phone: true,
      country: true,
      address: true,
      maskedCardNumber: true,
      maskedExpirationYear: true,
      createdAt: true,
      fullName: true,
    }
  });
  return latest;
}

module.exports = { registerBillingDetails, getBillingDetailsByUser };
