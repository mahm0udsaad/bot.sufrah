// Simple Prisma seed for PostgreSQL
// Run: pnpm prisma db seed

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  // Upsert a demo user
  const user = await prisma.user.upsert({
    where: { phone: "+966500000000" },
    update: {},
    create: {
      phone: "+966500000000",
      name: "Demo Owner",
      is_verified: true,
    },
  })

  // Ensure a restaurant profile exists for the user
  const restaurant = await prisma.restaurant.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      name: "مطعم سفرة",
      description: "حساب تجريبي",
      phone: "+966500000000",
      whatsappNumber: "+966500000000",
      address: "الرياض",
      isActive: true,
    },
  })

  // Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      restaurantId: restaurant.id,
      customerWa: "whatsapp:+966511111111",
      lastMessageAt: new Date(),
      status: "OPEN",
    },
  })

  // Create a template
  await prisma.template.create({
    data: {
      user_id: user.id,
      name: "ترحيب",
      category: "general",
      body_text: "أهلاً بك! كيف نقدر نخدمك اليوم؟",
      status: "approved",
      usage_count: 1,
    },
  })

  // Create an order
  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      conversationId: conversation.id,
      status: "CONFIRMED",
      totalCents: 3500,
      currency: "SAR",
      meta: { delivery_address: "الرياض" },
      items: {
        create: [
          {
            name: "كبسة",
            qty: 1,
            unitCents: 3500,
            totalCents: 3500,
          },
        ],
      },
    },
  })

  // Log usage
  await prisma.usageLog.create({
    data: {
      restaurantId: restaurant.id,
      action: "seed_initialized",
      details: { note: "Seed data created" },
    },
  })

  console.log("Seed completed")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

