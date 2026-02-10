import { type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import prisma from "@/lib/prisma"

/**
 * Get the authenticated user from the request
 * Returns the user object if authenticated, null otherwise
 */
export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    console.log("[server-auth] Checking authentication - phone:", userPhone || "NOT FOUND")

    if (!userPhone) {
      console.log("[server-auth] ❌ No user-phone cookie found")
      return null
    }

    const user = await db.getUserByPhone(userPhone)
    
    if (user) {
      console.log("[server-auth] ✅ User authenticated - id:", user.id, "phone:", user.phone)
    } else {
      console.log("[server-auth] ❌ User not found in database for phone:", userPhone)
    }
    
    return user
  } catch (error) {
    console.error("[server-auth] ❌ Authentication error:", error)
    return null
  }
}

/**
 * Get the restaurant for the authenticated user
 * Returns the restaurant object if found, null otherwise
 */
export async function getAuthenticatedRestaurant(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.log("[server-auth] ❌ Cannot fetch restaurant - user not authenticated")
      return null
    }

    // If client sends X-Restaurant-Id, resolve it first.
    // Supports both RestaurantProfile.id and RestaurantBot.id.
    const requestedRestaurantId =
      request.headers.get("x-restaurant-id") ||
      request.headers.get("X-Restaurant-Id")

    if (requestedRestaurantId) {
      const directRestaurant = await prisma.restaurant.findFirst({
        where: { id: requestedRestaurantId, userId: user.id },
        include: { bots: true },
      })
      if (directRestaurant) {
        console.log("[server-auth] ✅ Restaurant resolved from header (restaurant id):", directRestaurant.id)
        return directRestaurant
      }

      const botRestaurant = await prisma.restaurantBot.findFirst({
        where: { id: requestedRestaurantId },
        include: { restaurant: { include: { bots: true } } },
      })
      if (botRestaurant?.restaurant?.userId === user.id) {
        console.log("[server-auth] ✅ Restaurant resolved from header (bot id):", botRestaurant.restaurant.id)
        return botRestaurant.restaurant
      }
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)

    if (restaurant) {
      console.log("[server-auth] ✅ Restaurant found - id:", restaurant.id, "name:", restaurant.name)
    } else {
      console.log("[server-auth] ❌ No restaurant found for user:", user.id)
    }

    return restaurant
  } catch (error) {
    console.error("[server-auth] ❌ Restaurant fetch error:", error)
    return null
  }
}

/**
 * Get server session with user and restaurant information
 * Returns a session object compatible with NextAuth-style sessions
 */
export async function getServerSession() {
  try {
    const cookieStore = await cookies()
    const userPhone = cookieStore.get("user-phone")?.value

    if (!userPhone) {
      console.log("[server-auth] ❌ No user-phone cookie found")
      return null
    }

    const user = await db.getUserByPhone(userPhone)

    if (!user) {
      console.log("[server-auth] ❌ User not found in database for phone:", userPhone)
      return null
    }

    const restaurant = await db.getPrimaryRestaurantByUserId(user.id)

    console.log("[server-auth] ✅ Session created for user:", user.id)

    return {
      user: {
        ...user,
        tenantId: restaurant?.id,
        restaurant: restaurant ? {
          id: restaurant.id,
          name: restaurant.name,
        } : undefined,
        // Note: role field doesn't exist in database yet
        // You may need to add this to the User model if role-based auth is needed
        role: undefined,
      }
    }
  } catch (error) {
    console.error("[server-auth] ❌ Session error:", error)
    return null
  }
}
