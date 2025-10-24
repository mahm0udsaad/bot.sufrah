import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardOverview } from "@/components/dashboard-overview"
import { AuthGuard } from "@/components/auth-guard"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getDashboardOverview } from "@/lib/dashboard-actions"
import { getLocale } from "@/lib/i18n/server"

export default async function DashboardPage() {
  const cookieStore = cookies()
  const userPhone = cookieStore.get("user-phone")?.value

  if (!userPhone) {
    redirect("/signin")
  }

  const user = await db.getUserByPhone(userPhone)

  if (!user) {
    redirect("/signin")
  }

  const restaurant = await db.getPrimaryRestaurantByUserId(user.id)

  if (!restaurant) {
    redirect("/onboarding")
  }

  // Use the bot ID (tenantId) for API calls, not the restaurant ID
  const tenantId = restaurant.bots?.id || restaurant.id

  const locale = getLocale()
  const result = await getDashboardOverview(tenantId, locale, "SAR")

  const overviewData = result.error ? null : result.data
  const overviewError = result.error ?? null

  return (
    <AuthGuard>
      <DashboardLayout>
        <DashboardOverview
          overview={overviewData}
          error={overviewError}
          restaurantName={restaurant.name}
        />
      </DashboardLayout>
    </AuthGuard>
  )
}
