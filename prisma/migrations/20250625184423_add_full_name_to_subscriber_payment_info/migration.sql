-- CreateTable
CREATE TABLE "SubscriberPaymentInfo" (
    "id" SERIAL NOT NULL,
    "referenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "address" TEXT,
    "cvcEncrypted" TEXT NOT NULL,
    "expirationEncrypted" TEXT NOT NULL,
    "cardEncrypted" TEXT NOT NULL,
    "maskedCardNumber" TEXT NOT NULL,
    "maskedExpirationYear" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriberPaymentInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberPaymentInfo_referenceId_key" ON "SubscriberPaymentInfo"("referenceId");
