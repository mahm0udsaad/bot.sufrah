-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "is_verified" BOOLEAN DEFAULT false,
    "verification_code" TEXT,
    "verification_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "whatsapp_number" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_name" TEXT,
    "status" TEXT DEFAULT 'active',
    "last_message_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "window_expires_at" TIMESTAMP(3),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" TEXT DEFAULT 'text',
    "template_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "is_read" BOOLEAN DEFAULT false,
    "sent_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT DEFAULT 'en',
    "header_type" TEXT,
    "header_content" TEXT,
    "body_text" TEXT NOT NULL,
    "footer_text" TEXT,
    "buttons" JSONB DEFAULT '[]',
    "variables" JSONB DEFAULT '[]',
    "status" TEXT DEFAULT 'draft',
    "whatsapp_template_id" TEXT,
    "usage_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "customer_phone" TEXT NOT NULL,
    "customer_name" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "total_amount" DECIMAL(65,30),
    "currency" TEXT DEFAULT 'USD',
    "status" TEXT DEFAULT 'pending',
    "delivery_address" TEXT,
    "delivery_time" TIMESTAMP(3),
    "payment_method" TEXT,
    "payment_status" TEXT DEFAULT 'pending',
    "external_order_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "RestaurantProfile_user_id_idx" ON "RestaurantProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantProfile_user_id_key" ON "RestaurantProfile"("user_id");

-- CreateIndex
CREATE INDEX "Conversation_user_id_idx" ON "Conversation"("user_id");

-- CreateIndex
CREATE INDEX "Conversation_customer_phone_idx" ON "Conversation"("customer_phone");

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "Message_conversation_id_idx" ON "Message"("conversation_id");

-- CreateIndex
CREATE INDEX "Template_user_id_idx" ON "Template"("user_id");

-- CreateIndex
CREATE INDEX "Template_status_idx" ON "Template"("status");

-- CreateIndex
CREATE INDEX "Order_customer_phone_idx" ON "Order"("customer_phone");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "UsageLog_restaurant_id_idx" ON "UsageLog"("restaurant_id");

-- AddForeignKey
ALTER TABLE "RestaurantProfile" ADD CONSTRAINT "RestaurantProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "RestaurantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
