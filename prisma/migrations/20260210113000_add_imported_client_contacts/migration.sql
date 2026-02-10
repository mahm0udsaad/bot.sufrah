CREATE TABLE "ImportedClientContact" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImportedClientContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportedClientContact_restaurant_id_phone_key"
ON "ImportedClientContact"("restaurant_id", "phone");

CREATE INDEX "ImportedClientContact_restaurant_id_created_at_idx"
ON "ImportedClientContact"("restaurant_id", "created_at");

ALTER TABLE "ImportedClientContact"
ADD CONSTRAINT "ImportedClientContact_restaurant_id_fkey"
FOREIGN KEY ("restaurant_id") REFERENCES "RestaurantProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
