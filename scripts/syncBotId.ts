/**
 * Script to sync local RestaurantBot with existing external bot server bot
 * 
 * Usage:
 *   bun run scripts/syncBotId.ts <whatsappNumber> <externalBotId>
 * 
 * Example:
 *   bun run scripts/syncBotId.ts +966573610338 cmh93958o0004sauw8iv09f7n
 * 
 * This will:
 * 1. Verify the bot exists on external server
 * 2. Update (or create) local RestaurantBot record with that Bot ID
 * 3. Fetch and sync all bot details from external server
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BOT_API_URL = process.env.BOT_API_URL || process.env.BOT_URL || 'https://bot.sufrah.sa/api'
const BOT_API_TOKEN = process.env.BOT_API_TOKEN || process.env.DASHBOARD_PAT

async function main() {
  const whatsappNumber = process.argv[2]
  const externalBotId = process.argv[3]

  if (!whatsappNumber || !externalBotId) {
    console.error('❌ Usage: bun run scripts/syncBotId.ts <whatsappNumber> <externalBotId>')
    console.error('   Example: bun run scripts/syncBotId.ts +966573610338 cmh93958o0004sauw8iv09f7n')
    process.exit(1)
  }

  if (!BOT_API_TOKEN) {
    console.error('❌ Missing BOT_API_TOKEN or DASHBOARD_PAT environment variable')
    process.exit(1)
  }

  console.log(`\n🔍 Step 1: Finding restaurant with WhatsApp: ${whatsappNumber}`)

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

  console.log(`✅ Found restaurant:`)
  console.log(`   Restaurant ID: ${restaurant.id}`)
  console.log(`   Name: ${restaurant.name}`)
  console.log(`   Owner: ${restaurant.user?.name || 'N/A'} (${restaurant.user?.phone})`)

  if (restaurant.bots) {
    console.log(`   Current Bot ID: ${restaurant.bots.id}`)
    
    if (restaurant.bots.id === externalBotId) {
      console.log(`\n✅ Bot ID already matches! No sync needed.`)
      console.log(`   Your configuration is correct.`)
      process.exit(0)
    }
  }

  console.log(`\n🔍 Step 2: Verifying bot exists on external server: ${externalBotId}`)

  try {
    const response = await fetch(`${BOT_API_URL}/admin/bots/${externalBotId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BOT_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.error(`\n❌ Bot ID ${externalBotId} not found on external server`)
        console.error(`   Please verify the Bot ID is correct.`)
        console.error(`   Or use the onboarding flow to register a new bot.`)
        process.exit(1)
      }
      throw new Error(`External server returned ${response.status}`)
    }

    const externalBot = await response.json()
    console.log(`✅ Bot found on external server:`)
    console.log(`   Bot ID: ${externalBot.id}`)
    console.log(`   Name: ${externalBot.name}`)
    console.log(`   Restaurant: ${externalBot.restaurantName}`)
    console.log(`   WhatsApp: ${externalBot.whatsappNumber}`)
    console.log(`   Status: ${externalBot.status}`)

    console.log(`\n🔄 Step 3: Syncing to local database...`)

    // Normalize phone number
    const normalizePlus = (value?: string | null) => {
      if (!value || typeof value !== "string") return ""
      const withoutPrefix = value.startsWith("whatsapp:") ? value.slice(9) : value
      return withoutPrefix.startsWith("+") ? withoutPrefix : `+${withoutPrefix}`
    }

    const normalizedNumber = normalizePlus(externalBot.whatsappNumber)

    const botData = {
      accountSid: externalBot.accountSid || externalBot.subaccountSid || 'placeholder',
      name: externalBot.name || externalBot.restaurantName || restaurant.name,
      restaurantName: externalBot.restaurantName || externalBot.name || restaurant.name,
      authToken: externalBot.authToken || 'placeholder',
      whatsappNumber: normalizedNumber,
      senderSid: externalBot.senderSid || null,
      wabaId: externalBot.wabaId || null,
      status: (externalBot.status || 'ACTIVE') as any,
      verifiedAt: externalBot.verifiedAt ? new Date(externalBot.verifiedAt) : new Date(),
      errorMessage: null,
      verificationSid: null,
      subaccountSid: externalBot.subaccountSid || externalBot.accountSid || null,
      isActive: externalBot.isActive !== false,
    }

    if (restaurant.bots) {
      // Update existing bot record (delete old, create new with correct ID)
      console.log(`   Removing old bot record: ${restaurant.bots.id}`)
      await prisma.restaurantBot.delete({
        where: { id: restaurant.bots.id },
      })
    }

    // Create new record with external Bot ID
    console.log(`   Creating new bot record with ID: ${externalBotId}`)
    const localBot = await prisma.restaurantBot.create({
      data: {
        id: externalBotId,  // Use external server's Bot ID
        ...botData,
        restaurantId: restaurant.id,
      },
    })

    // Update restaurant WhatsApp number to match
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { whatsappNumber: normalizedNumber },
    })

    console.log(`\n✅ Successfully synced!`)
    console.log(`   Local Bot ID: ${localBot.id}`)
    console.log(`   Status: ${localBot.status}`)
    console.log(`   Active: ${localBot.isActive ? '✅' : '❌'}`)

    console.log(`\n🎉 Done! You can now test the dashboard:`)
    console.log(`   1. Login with: ${restaurant.user?.phone}`)
    console.log(`   2. Dashboard should load without 403 errors`)
    console.log(`   3. Check auth API: curl http://localhost:3000/api/auth/me`)
    
  } catch (error) {
    console.error(`\n❌ Error syncing with external server:`, error)
    console.error(`   Please check:`)
    console.error(`   - BOT_API_URL is correct: ${BOT_API_URL}`)
    console.error(`   - BOT_API_TOKEN is valid`)
    console.error(`   - External bot server is accessible`)
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

