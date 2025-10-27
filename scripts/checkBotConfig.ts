/**
 * Script to check current bot configuration in the database
 * 
 * Usage:
 *   bun run scripts/checkBotConfig.ts [whatsappNumber]
 * 
 * Example:
 *   bun run scripts/checkBotConfig.ts +966573610338
 *   bun run scripts/checkBotConfig.ts  (shows all bots)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const whatsappNumber = process.argv[2]

  if (whatsappNumber) {
    // Show specific restaurant/bot
    console.log(`\n🔍 Looking for restaurant with WhatsApp: ${whatsappNumber}\n`)

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
      console.error(`❌ No restaurant found with WhatsApp number: ${whatsappNumber}`)
      process.exit(1)
    }

    console.log('📋 Restaurant Details:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Restaurant ID:  ${restaurant.id}`)
    console.log(`Name:           ${restaurant.name}`)
    console.log(`WhatsApp:       ${restaurant.whatsappNumber}`)
    console.log(`Phone:          ${restaurant.phone}`)
    console.log(`Owner:          ${restaurant.user?.name || 'N/A'} (${restaurant.user?.phone})`)
    console.log(`Status:         ${restaurant.status}`)
    console.log(`Active:         ${restaurant.isActive ? '✅' : '❌'}`)

    if (restaurant.bots) {
      console.log('\n🤖 Bot Configuration:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`Bot ID:         ${restaurant.bots.id} ⬅️  USE THIS IN API CALLS`)
      console.log(`Name:           ${restaurant.bots.name}`)
      console.log(`WhatsApp:       ${restaurant.bots.whatsappNumber}`)
      console.log(`Status:         ${restaurant.bots.status}`)
      console.log(`Active:         ${restaurant.bots.isActive ? '✅' : '❌'}`)
      console.log(`Account SID:    ${restaurant.bots.accountSid}`)
      console.log(`Verified:       ${restaurant.bots.verifiedAt ? '✅' : '⏳'}`)

      console.log('\n✅ API Configuration:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`X-Restaurant-Id: ${restaurant.bots.id}`)
      console.log(`URL Path:        /api/tenants/${restaurant.bots.id}/overview`)
      
      console.log('\n📝 Example API Call:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`curl -X GET \\`)
      console.log(`  "https://bot.sufrah.sa/api/tenants/${restaurant.bots.id}/overview?currency=SAR" \\`)
      console.log(`  -H "Authorization: Bearer $DASHBOARD_PAT" \\`)
      console.log(`  -H "X-Restaurant-Id: ${restaurant.bots.id}"`)
    } else {
      console.log('\n⚠️  No bot configured for this restaurant!')
      console.log('   Run: bun run scripts/updateBotId.ts <whatsapp> <botId>')
    }
  } else {
    // Show all restaurants and bots
    console.log('\n📋 All Restaurants & Bots:\n')

    const restaurants = await prisma.restaurant.findMany({
      include: {
        bots: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (restaurants.length === 0) {
      console.log('No restaurants found in database.')
      process.exit(0)
    }

    restaurants.forEach((restaurant, index) => {
      console.log(`${index + 1}. ${restaurant.name}`)
      console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`   Restaurant ID:  ${restaurant.id}`)
      console.log(`   WhatsApp:       ${restaurant.whatsappNumber || restaurant.phone}`)
      console.log(`   Owner:          ${restaurant.user?.phone}`)
      
      if (restaurant.bots) {
        console.log(`   Bot ID:         ${restaurant.bots.id} ⬅️  USE THIS`)
        console.log(`   Bot Status:     ${restaurant.bots.status} ${restaurant.bots.isActive ? '✅' : '❌'}`)
      } else {
        console.log(`   Bot ID:         ⚠️  Not configured`)
      }
      console.log('')
    })

    console.log('\n💡 To see details for a specific restaurant:')
    console.log('   bun run scripts/checkBotConfig.ts <whatsappNumber>')
  }

  console.log('')
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

