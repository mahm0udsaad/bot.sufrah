/**
 * Script to update or create RestaurantBot record with a specific Bot ID
 * 
 * Usage:
 *   bun run scripts/updateBotId.ts <whatsappNumber> <botId>
 * 
 * Example:
 *   bun run scripts/updateBotId.ts +966573610338 cmh93958o0004sauw8iv09f7n
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const whatsappNumber = process.argv[2]
  const botId = process.argv[3]

  if (!whatsappNumber || !botId) {
    console.error('❌ Usage: bun run scripts/updateBotId.ts <whatsappNumber> <botId>')
    console.error('   Example: bun run scripts/updateBotId.ts +966573610338 cmh93958o0004sauw8iv09f7n')
    process.exit(1)
  }

  console.log(`\n🔍 Looking for restaurant with WhatsApp: ${whatsappNumber}`)

  // Find restaurant by WhatsApp number
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      OR: [
        { whatsappNumber },
        { phone: whatsappNumber },
      ],
    },
    include: {
      bots: true,
      user: true,
    },
  })

  if (!restaurant) {
    console.error(`\n❌ No restaurant found with WhatsApp number: ${whatsappNumber}`)
    console.error('   Please check the number and try again.')
    process.exit(1)
  }

  console.log(`\n✅ Found restaurant:`)
  console.log(`   ID: ${restaurant.id}`)
  console.log(`   Name: ${restaurant.name}`)
  console.log(`   Owner: ${restaurant.user?.name || 'N/A'} (${restaurant.user?.phone})`)
  console.log(`   WhatsApp: ${restaurant.whatsappNumber}`)

  // Check if bot exists
  if (restaurant.bots) {
    console.log(`\n⚠️  Existing bot found:`)
    console.log(`   Current Bot ID: ${restaurant.bots.id}`)
    console.log(`   Status: ${restaurant.bots.status}`)
    console.log(`   WhatsApp: ${restaurant.bots.whatsappNumber}`)

    // Delete the old bot record
    console.log(`\n🗑️  Deleting old bot record...`)
    await prisma.restaurantBot.delete({
      where: { id: restaurant.bots.id },
    })
    console.log(`   ✅ Old bot deleted`)
  }

  // Create new bot with specified ID
  console.log(`\n✨ Creating new bot with ID: ${botId}`)
  
  const newBot = await prisma.restaurantBot.create({
    data: {
      id: botId, // Use the specific Bot ID
      name: restaurant.name,
      restaurantName: restaurant.name,
      whatsappNumber: whatsappNumber,
      accountSid: 'placeholder-account-sid', // These can be updated later through onboarding
      authToken: 'placeholder-auth-token',
      status: 'ACTIVE',
      isActive: true,
      restaurantId: restaurant.id,
    },
  })

  console.log(`\n✅ Bot created successfully!`)
  console.log(`   Bot ID: ${newBot.id}`)
  console.log(`   Restaurant: ${newBot.restaurantName}`)
  console.log(`   WhatsApp: ${newBot.whatsappNumber}`)
  console.log(`   Status: ${newBot.status}`)

  console.log(`\n🎉 Done! The dashboard will now use Bot ID: ${botId}`)
  console.log(`   Test with: curl http://localhost:3000/api/auth/me`)
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

