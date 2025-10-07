"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

interface SignOutButtonProps {
  className?: string
  variant?: "ghost" | "secondary" | "destructive" | "default" | "outline" | "link"
  size?: "sm" | "md" | "lg" | "icon"
}

export function SignOutButton({ className, variant = "ghost", size = "sm" }: SignOutButtonProps) {
  const { signOut } = useAuth()

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => void signOut()}
    >
      <LogOut className="h-4 w-4 mr-2" />
      Sign out
    </Button>
  )
}



