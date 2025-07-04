-- DropIndex
DROP INDEX "BusinessDetails_bizId_key";

-- AlterTable
ALTER TABLE "BusinessDetails" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
