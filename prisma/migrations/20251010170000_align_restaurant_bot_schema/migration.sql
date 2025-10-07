ALTER TABLE "RestaurantBot"
  ADD COLUMN IF NOT EXISTS "restaurant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "BotStatus" DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "sender_sid" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_sid" TEXT,
  ADD COLUMN IF NOT EXISTS "waba_id" TEXT,
  ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "error_message" TEXT;

ALTER TABLE "RestaurantBot"
  ALTER COLUMN "status" SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE "RestaurantBot"
    ADD CONSTRAINT "RestaurantBot_restaurant_id_key" UNIQUE ("restaurant_id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "RestaurantBot"
    ADD CONSTRAINT "RestaurantBot_restaurant_id_fkey"
    FOREIGN KEY ("restaurant_id") REFERENCES "RestaurantProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "RestaurantBot_restaurant_id_idx" ON "RestaurantBot"("restaurant_id");
CREATE INDEX IF NOT EXISTS "RestaurantBot_status_idx" ON "RestaurantBot"("status");
CREATE INDEX IF NOT EXISTS "RestaurantBot_subaccountSid_idx" ON "RestaurantBot"("twilioSubaccountSid");
