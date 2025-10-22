"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface User {
  id: string
  phone_number: string
  name?: string
  email?: string
  is_verified: boolean
  tenantId?: string | null
  restaurant?: {
    id: string
    name: string
    description?: string
    phone?: string
    whatsapp_number?: string
    address?: string
    is_active: boolean
    external_merchant_id?: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  signIn: (phone: string) => Promise<{ success: boolean; message: string }>
  verifyCode: (phone: string, code: string) => Promise<{ success: boolean; message: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
      setUser(null)
      window.location.href = "/signin"
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  const signIn = async (phone: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      })

      const contentType = response.headers.get("content-type") || ""
      let body: unknown = null

      if (contentType.includes("application/json")) {
        body = await response.json()
      } else {
        const text = await response.text()
        body = text ? { message: text } : null
      }

      const bodyRecord = body && typeof body === "object" ? (body as Record<string, unknown>) : null
      const bodyMessage = bodyRecord?.message
      const fallbackMessage = response.statusText || "Failed to send verification code"
      const resolvedMessage = typeof bodyMessage === "string" && bodyMessage.trim().length > 0 ? bodyMessage : fallbackMessage

      if (response.ok) {
        return {
          success: true,
          message: resolvedMessage || "Verification code sent",
        }
      } else {
        return {
          success: false,
          message: resolvedMessage || "Failed to send verification code",
        }
      }
    } catch (error) {
      console.error("Sign in error:", error)
      return { success: false, message: "Network error. Please try again." }
    }
  }

  const verifyCode = async (phone: string, code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, code }),
      })

      const contentType = response.headers.get("content-type") || ""
      let body: unknown = null

      if (contentType.includes("application/json")) {
        body = await response.json()
      } else {
        const text = await response.text()
        body = text ? { message: text } : null
      }

      const bodyRecord = body && typeof body === "object" ? (body as Record<string, unknown>) : null
      const bodyMessage = bodyRecord?.message
      const fallbackMessage = response.statusText || "Verification failed"
      const resolvedMessage = typeof bodyMessage === "string" && bodyMessage.trim().length > 0 ? bodyMessage : fallbackMessage

      if (response.ok) {
        // Refresh user data after successful verification
        await fetchUser()
        return {
          success: true,
          message: resolvedMessage || "Successfully verified",
        }
      } else {
        return {
          success: false,
          message: resolvedMessage || "Invalid verification code",
        }
      }
    } catch (error) {
      console.error("Verify code error:", error)
      return { success: false, message: "Network error. Please try again." }
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser, signIn, verifyCode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "")

  if (phone.startsWith("+")) {
    // If it already starts with +, just clean and return
    return "+" + cleaned
  }

  // If no country code, add + to the cleaned number (let the user's input determine the country)
  return "+" + cleaned
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
