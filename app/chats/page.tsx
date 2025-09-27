"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { BotIntegration } from "@/components/bot-integration"
import { ChatProvider } from "@/contexts/chat-context"

export default function ChatsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <ChatProvider>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">WhatsApp Chats</h1>
                <p className="text-muted-foreground">Manage customer conversations with real-time bot integration</p>
              </div>
            </div>

            <BotIntegration />
          </div>
        </ChatProvider>
      </DashboardLayout>
    </AuthGuard>
  )
}
