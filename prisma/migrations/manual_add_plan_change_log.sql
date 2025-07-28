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
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zipCode" TEXT,

    CONSTRAINT "SubscriberPaymentInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDetails" (
    "id" SERIAL NOT NULL,
    "bizId" TEXT NOT NULL,
    "bizName" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "categories" TEXT[],
    "servicesOffered" TEXT[],
    "keywords" TEXT[],
    "description" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "otherWebsites" TEXT[],
    "images" TEXT[],
    "iconUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "bizAlias" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "officeHours" JSONB,

    CONSTRAINT "BusinessDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_logs" (
    "id" SERIAL NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responsetime" DOUBLE PRECISION NOT NULL,
    "ip" TEXT NOT NULL,
    "useragent" TEXT NOT NULL,
    "machinename" TEXT NOT NULL,
    "macaddress" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanChangeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldPlan" TEXT NOT NULL,
    "newPlan" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceId" TEXT NOT NULL,

    CONSTRAINT "PlanChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberPaymentInfo_referenceId_key" ON "SubscriberPaymentInfo"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanChangeLog_referenceId_key" ON "PlanChangeLog"("referenceId");

