-- CreateEnum
CREATE TYPE "card_state" AS ENUM ('new');

-- CreateTable
CREATE TABLE "decks" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "source_language" VARCHAR(10) NOT NULL,
    "target_language" VARCHAR(10) NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "word" VARCHAR(200) NOT NULL,
    "translation" VARCHAR(200) NOT NULL,
    "part_of_speech" VARCHAR(40),
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "example_sentence" TEXT,
    "example_translation" TEXT,
    "personal_note" TEXT,
    "state" "card_state" NOT NULL DEFAULT 'new',
    "deck_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "decks_user_id_idx" ON "decks"("user_id");

-- CreateIndex
CREATE INDEX "cards_deck_id_idx" ON "cards"("deck_id");

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
