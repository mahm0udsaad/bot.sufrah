import { Loader2 } from "lucide-react"

export default function LoadingRatings() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

