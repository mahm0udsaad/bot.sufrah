"use client"

import { useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Send, User, Phone, Clock, AlertCircle, Loader2, Bot } from "lucide-react"
import { useChat } from "@/contexts/chat-context"

const stripWhatsAppPrefix = (value?: string | null) => value?.replace(/^whatsapp:/i, "") ?? ""

export function BotIntegration() {
  const [messageInput, setMessageInput] = useState("")
  const {
    conversations,
    messages,
    selectedConversationId,
    botStatus,
    isLoadingConversations,
    isLoadingMessages,
    isSendingMessage,
    error,
    selectConversation,
    sendMessage,
  } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)
  const currentMessages = selectedConversationId ? messages[selectedConversationId] || [] : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentMessages.length, selectedConversationId])

  const handleSendMessage = async () => {
    if (!messageInput.trim()) {
      return
    }

    try {
      await sendMessage(messageInput.trim())
      setMessageInput("")
    } catch (err) {
      console.error("Failed to send message", err)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:h-[calc(100vh-12rem)]">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`h-2 w-2 rounded-full ${botStatus.enabled ? "bg-green-500" : "bg-yellow-500"}`} />
              <span>{botStatus.enabled ? "Bot active" : "Bot pending"}</span>
            </div>
          </div>
          {botStatus.lastSyncedAt ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bot className="h-3 w-3" />
              <span>
                Synced {formatDistanceToNow(new Date(botStatus.lastSyncedAt), { addSuffix: true })}
              </span>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <Alert className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <ScrollArea className="h-[26rem]">
            {isLoadingConversations && conversations.length === 0 ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="mb-4 h-10 w-10 opacity-60" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`w-full rounded-lg p-3 text-left transition-colors focus:outline-none ${
                      selectedConversationId === conversation.id
                        ? "border border-primary/20 bg-primary/10"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {conversation.customerName?.charAt(0) || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">
                              {conversation.customerName || stripWhatsAppPrefix(conversation.customerWa)}
                            </p>
                            {conversation.unreadCount > 0 ? (
                              <Badge variant="destructive" className="px-1.5 py-0 text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{stripWhatsAppPrefix(conversation.customerWa)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={conversation.status === "OPEN" ? "default" : "secondary"}>
                        {conversation.status === "OPEN" ? "Active" : "Closed"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedConversation ? (
                <>
                  <Avatar>
                    <AvatarFallback>
                      {selectedConversation.customerName?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedConversation.customerName || stripWhatsAppPrefix(selectedConversation.customerWa)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stripWhatsAppPrefix(selectedConversation.customerWa)}
                    </p>
                  </div>
                </>
              ) : (
                <CardTitle className="text-lg">Select a conversation</CardTitle>
              )}
            </div>
            <Badge variant={botStatus.enabled ? "default" : "secondary"}>
              {botStatus.enabled ? "Bot Enabled" : "Bot Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {!selectedConversationId ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="mb-4 h-14 w-14 opacity-60" />
              <p>Select a conversation to start chatting</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {isLoadingMessages && currentMessages.length === 0 ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}>
                        <div className="max-w-[70%] rounded-lg p-4">
                          <Skeleton className="mb-2 h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="mb-3 h-10 w-10 opacity-60" />
                    <p>No messages yet. Start the conversation below.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.direction === "IN" ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-3 text-sm shadow ${
                            message.direction === "IN"
                              ? "bg-muted text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p>{message.body}</p>
                          <span className="mt-2 block text-xs opacity-70">
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              <div className="border-t border-border p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    disabled={!selectedConversationId}
                    onChange={(event) => setMessageInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        void handleSendMessage()
                      }
                    }}
                  />
                  <Button
                    onClick={() => void handleSendMessage()}
                    disabled={!messageInput.trim() || isSendingMessage || !selectedConversationId}
                  >
                    {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
