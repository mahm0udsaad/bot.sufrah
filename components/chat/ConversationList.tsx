"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Search, MessageCircle, Bot, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { toast } from "sonner"

interface BotConversation {
  id: string
  customer_phone: string
  customer_name: string
  status: "active" | string
  last_message_at: string
  unread_count: number
  is_bot_active: boolean
}

interface ConversationListProps {
  conversations: BotConversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleBot?: (conversationId: string, enabled: boolean) => Promise<void>
}

export function ConversationList({ conversations, selectedId, onSelect, onToggleBot }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [togglingConversations, setTogglingConversations] = useState<Set<string>>(new Set())

  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase()
    const name = (conv.customer_name || "").toLowerCase()
    const phone = conv.customer_phone || ""
    return name.includes(query) || phone.includes(query)
  })

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ar })
    } catch {
      return timestamp
    }
  }

  const handleToggleBot = async (conversationId: string, enabled: boolean) => {
    if (!onToggleBot) return

    setTogglingConversations((prev) => new Set([...prev, conversationId]))
    
    try {
      await onToggleBot(conversationId, enabled)
      toast.success(enabled ? "تم تشغيل البوت للمحادثة" : "تم إيقاف البوت للمحادثة")
    } catch (error) {
      console.error("Failed to toggle bot:", error)
      toast.error("فشل تغيير حالة البوت")
    } finally {
      setTogglingConversations((prev) => {
        const next = new Set(prev)
        next.delete(conversationId)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-3 md:p-4 border-b">
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
          <h2 className="font-semibold text-base md:text-lg">المحادثات</h2>
          {conversations.length > 0 && (
            <Badge variant="secondary" className="mr-auto text-xs">
              {conversations.length}
            </Badge>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-2.5 md:right-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="بحث في المحادثات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 md:pr-10 h-9 md:h-10 text-sm"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-6 md:p-8 text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
            <p className="text-sm">{searchQuery ? "لا توجد محادثات مطابقة" : "لا توجد محادثات"}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "w-full p-3 md:p-4 text-right hover:bg-accent transition-colors",
                  selectedId === conversation.id && "bg-accent"
                )}
              >
                <div className="flex items-start gap-2 md:gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5 md:mb-1">
                      <h3 className="font-semibold text-sm md:text-base truncate">
                        {conversation.customer_name || conversation.customer_phone}
                      </h3>
                      {conversation.unread_count > 0 && (
                        <Badge variant="default" className="rounded-full px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1.5 md:mb-2">
                      <p className="text-xs md:text-sm text-muted-foreground truncate" dir="ltr">
                        {conversation.customer_phone}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(conversation.last_message_at)}
                      </p>
                    </div>

                    {/* Status indicators and bot toggle */}
                    <div className="flex items-center justify-between gap-1.5 md:gap-2">
                      <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                        <Badge
                          variant={conversation.status === "active" ? "default" : "secondary"}
                          className="text-[10px] md:text-xs px-1.5 py-0"
                        >
                          {conversation.status === "active" ? "نشط" : "مغلق"}
                        </Badge>
                        <Badge 
                          variant={conversation.is_bot_active ? "outline" : "secondary"} 
                          className="text-[10px] md:text-xs gap-1 px-1.5 py-0"
                        >
                          <Bot className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          <span className="hidden sm:inline">{conversation.is_bot_active ? "بوت نشط" : "بوت متوقف"}</span>
                          <span className="sm:hidden">{conversation.is_bot_active ? "نشط" : "متوقف"}</span>
                        </Badge>
                      </div>
                      
                      {onToggleBot && (
                        <div 
                          className="flex items-center gap-1 pr-1 md:pr-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {togglingConversations.has(conversation.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : (
                            <Switch
                              checked={conversation.is_bot_active}
                              onCheckedChange={(enabled) => handleToggleBot(conversation.id, enabled)}
                              disabled={togglingConversations.has(conversation.id)}
                              className="scale-75 md:scale-100"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

