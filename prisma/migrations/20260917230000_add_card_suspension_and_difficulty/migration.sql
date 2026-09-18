-- CreateEnum
CREATE TYPE "review_grade" AS ENUM ('again', 'hard', 'good', 'easy');

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_grade" "review_grade";
