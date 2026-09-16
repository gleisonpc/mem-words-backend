-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "card_state" ADD VALUE 'learning';
ALTER TYPE "card_state" ADD VALUE 'review';

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "due_at" TIMESTAMP(3),
ADD COLUMN     "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN     "interval_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "learning_step" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "cards_due_at_idx" ON "cards"("due_at");
