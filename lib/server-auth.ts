import { type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

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

