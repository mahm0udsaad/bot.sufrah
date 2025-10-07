DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BotStatus') THEN
    CREATE TYPE "BotStatus" AS ENUM ('PENDING', 'VERIFYING', 'ACTIVE', 'FAILED');
  ELSE
    BEGIN
      ALTER TYPE "BotStatus" ADD VALUE IF NOT EXISTS 'VERIFYING';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE "RestaurantBot"
  RENAME COLUMN "whatsappFrom" TO "whatsappNumber";

ALTER TABLE "RestaurantBot"
  ADD COLUMN IF NOT EXISTS "senderSid" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationSid" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

DROP INDEX IF EXISTS "RestaurantBot_whatsappFrom_key";
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantBot_whatsappNumber_key" ON "RestaurantBot"("whatsappNumber");
