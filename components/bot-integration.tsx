"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Send, Bot, User, Phone, Clock, AlertCircle, CheckCircle } from "lucide-react"
import { useChat } from "@/contexts/chat-context"
import { formatDistanceToNow } from "date-fns"

export function BotIntegration() {
  const [messageInput, setMessageInput] = useState("")
  const {
    conversations,
    messages,
    selectedConversationId,
    botStatus,
    loading,
    connected,
    error,
    selectConversation,
    sendMessage,
    toggleBot,
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages[selectedConversationId || ""]])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) return

    try {
      await sendMessage(messageInput.trim())
      setMessageInput("")
    } catch (error) {
      console.error("[v0] Failed to send message:", error)
    }
  }

  const handleToggleBot = async () => {
    try {
      await toggleBot(!botStatus.enabled)
    } catch (error) {
      console.error("[v0] Failed to toggle bot:", error)
    }
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)
  const currentMessages = selectedConversationId ? messages[selectedConversationId] || [] : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Conversations</CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-yellow-500"}`} />
              <span className="text-xs text-muted-foreground">{connected ? "Live" : "Offline"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <Alert className="m-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ScrollArea className="h-[400px]">
            {loading.conversations && conversations.length === 0 ? (
              <div className="space-y-1 p-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversationId === conversation.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => selectConversation(conversation.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {conversation.customer_name?.charAt(0) || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{conversation.customer_name || "Unknown Customer"}</p>
                            {conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{conversation.customer_phone}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={conversation.status === "active" ? "default" : "secondary"}>
                        {conversation.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedConversation ? (
                <>
                  <Avatar>
                    <AvatarFallback>
                      {selectedConversation.customer_name?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {selectedConversation.customer_name || "Unknown Customer"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedConversation.customer_phone}</p>
                  </div>
                </>
              ) : (
                <CardTitle className="text-lg">Select a conversation</CardTitle>
              )}
            </div>

            {/* Bot Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="bot-enabled"
                  checked={botStatus.enabled}
                  onCheckedChange={handleToggleBot}
                  disabled={loading.botToggle}
                />
                <Label htmlFor="bot-enabled" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Bot {botStatus.enabled ? "On" : "Off"}
                </Label>
              </div>
              {botStatus.enabled ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-y-scroll">
          {!selectedConversationId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a conversation to start chatting</p>
                <p className="text-sm">Choose from the conversations on the left</p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 p-4">
                {loading.messages && currentMessages.length === 0 ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                        <div className="max-w-[70%] rounded-lg p-4">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <div className="h-[45vh] overflow-y-scroll space-y-4">
                    {currentMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_from_customer ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            message.is_from_customer ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                          } ${message.id.startsWith("temp-") ? "opacity-70" : ""}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.is_from_customer ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                            <span className="text-xs opacity-70">
                              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          {message.media_url && (
                            <div className="mt-2">
                              <a
                                href={message.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline opacity-70"
                              >
                                View Media
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={loading.sendingMessage}
                  />
                  <Button onClick={handleSendMessage} disabled={!messageInput.trim()} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
