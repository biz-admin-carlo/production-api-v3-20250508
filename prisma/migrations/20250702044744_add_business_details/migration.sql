-- AlterTable
ALTER TABLE "SubscriberPaymentInfo" ALTER COLUMN "fullName" DROP NOT NULL;

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
    "officeHours" TEXT[],
    "images" TEXT[],
    "iconUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDetails_bizId_key" ON "BusinessDetails"("bizId");
