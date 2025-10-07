-- Drop legacy conversation/message/order structures
DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "Message" CASCADE;
DROP TABLE IF EXISTS "Conversation" CASCADE;

-- Enum definitions for new workflow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BotStatus') THEN
    CREATE TYPE "BotStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConvStatus') THEN
    CREATE TYPE "ConvStatus" AS ENUM ('OPEN', 'CLOSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MsgDir') THEN
    CREATE TYPE "MsgDir" AS ENUM ('IN', 'OUT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
  END IF;
END $$;

-- Restaurant bot status -> enum + unique sender
ALTER TABLE "RestaurantBot"
  ALTER COLUMN "status" DROP DEFAULT;

UPDATE "RestaurantBot" SET "status" = UPPER("status");

ALTER TABLE "RestaurantBot"
  ALTER COLUMN "status" TYPE "BotStatus" USING ("status"::"BotStatus"),
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantBot_whatsappFrom_key" ON "RestaurantBot"("whatsappFrom");

-- Conversations
CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "customer_wa" TEXT NOT NULL,
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ConvStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_restaurant_id_last_message_at_idx" ON "Conversation"("restaurant_id", "last_message_at");
CREATE INDEX "Conversation_customer_wa_idx" ON "Conversation"("customer_wa");
CREATE UNIQUE INDEX "Conversation_restaurant_id_customer_wa_key" ON "Conversation"("restaurant_id", "customer_wa");

-- Messages
CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "direction" "MsgDir" NOT NULL,
  "wa_sid" TEXT,
  "body" TEXT NOT NULL,
  "media_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Message_wa_sid_key" ON "Message"("wa_sid");
CREATE INDEX "Message_restaurant_id_created_at_idx" ON "Message"("restaurant_id", "created_at");
CREATE INDEX "Message_conversation_id_created_at_idx" ON "Message"("conversation_id", "created_at");

-- Orders
CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "conversation_id" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
  "total_cents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "meta" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_restaurant_id_created_at_idx" ON "Order"("restaurant_id", "created_at");
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- Order items
CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "unit_cents" INTEGER NOT NULL,
  "total_cents" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItem_order_id_idx" ON "OrderItem"("order_id");

-- Foreign keys
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "RestaurantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "RestaurantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "RestaurantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Order_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Usage log FK might rely on old constraints - ensure cascade to RestaurantProfile
ALTER TABLE "UsageLog" DROP CONSTRAINT IF EXISTS "UsageLog_restaurant_id_fkey";
ALTER TABLE "UsageLog"
  ADD CONSTRAINT "UsageLog_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "RestaurantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
