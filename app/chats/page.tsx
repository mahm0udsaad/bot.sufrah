"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { BotWebSocketProvider } from "@/contexts/bot-websocket-context"
import { ChatInterface } from "@/components/chat/ChatInterface"
import { Toaster } from "@/components/ui/sonner"

export default function ChatsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <BotWebSocketProvider>
          <div className="h-[calc(100vh-4rem)] p-4 md:p-6">
            <ChatInterface />
          </div>
          <Toaster />
        </BotWebSocketProvider>
      </DashboardLayout>
    </AuthGuard>
  )
}
