-- CreateTable
CREATE TABLE "RestaurantBot" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "subaccountSid" TEXT NOT NULL,
    "authToken" TEXT NOT NULL,
    "whatsappFrom" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantBot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantBot_subaccountSid_key" ON "RestaurantBot"("subaccountSid");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantBot_restaurantId_key" ON "RestaurantBot"("restaurantId");

-- CreateIndex
CREATE INDEX "RestaurantBot_restaurantId_idx" ON "RestaurantBot"("restaurantId");

-- AddForeignKey
ALTER TABLE "RestaurantBot" ADD CONSTRAINT "RestaurantBot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "RestaurantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
