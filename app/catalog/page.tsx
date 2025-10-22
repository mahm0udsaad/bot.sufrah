import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { CatalogView } from "@/components/catalog-view"

export default function CatalogPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <CatalogView />
      </DashboardLayout>
    </AuthGuard>
  )
}
