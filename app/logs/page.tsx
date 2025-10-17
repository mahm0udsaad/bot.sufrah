"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  FileText, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Send,
  MessageSquare,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface WebhookLog {
  id: string
  restaurantId: string | null
  requestId: string
  method: string
  path: string
  headers: any
  body: any
  statusCode: number | null
  errorMessage: string | null
  createdAt: string
}

interface OutboundMessage {
  id: string
  restaurantId: string | null
  conversationId: string | null
  toPhone: string
  fromPhone: string
  body: string | null
  channel: string | null
  templateSid: string | null
  templateName: string | null
  status: string
  waSid: string | null
  errorCode: string | null
  errorMessage: string | null
  metadata: any
  createdAt: string
  updatedAt: string
}

function WebhookLogsTab() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [pathFilter, setPathFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (pathFilter !== "ALL") params.append("path", pathFilter)
        if (statusFilter !== "ALL") params.append("status", statusFilter)
        
        const response = await fetch(`/api/logs/webhook?${params.toString()}`, { cache: "no-store" })
        
        if (!response.ok) {
          throw new Error("Failed to fetch webhook logs")
        }

        const data = await response.json()
        if (data.success && data.logs) {
          setLogs(data.logs)
        }
      } catch (error) {
        console.error("Failed to load webhook logs:", error)
        toast.error("Unable to load webhook logs")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      void fetchLogs()
    }
  }, [user, pathFilter, statusFilter])

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.requestId.toLowerCase().includes(query) ||
      log.path.toLowerCase().includes(query) ||
      log.method.toLowerCase().includes(query)
    )
  })

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by request ID, path, or method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={pathFilter} onValueChange={setPathFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by path" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Paths</SelectItem>
            <SelectItem value="/status">/status</SelectItem>
            <SelectItem value="/webhook">/webhook</SelectItem>
            <SelectItem value="/bot">/bot</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="200">200 OK</SelectItem>
            <SelectItem value="400">400 Bad Request</SelectItem>
            <SelectItem value="500">500 Server Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No webhook logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <Collapsible key={log.id} asChild open={expandedRows.has(log.id)}>
                      <>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(log.id)}
                              className="h-6 w-6 p-0"
                            >
                              {expandedRows.has(log.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.path}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                log.statusCode && log.statusCode >= 200 && log.statusCode < 300
                                  ? "bg-green-100 text-green-800"
                                  : log.statusCode && log.statusCode >= 400
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {log.statusCode || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.requestId.slice(0, 8)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <CollapsibleContent>
                              <div className="p-4 bg-muted/30 space-y-3">
                                {log.errorMessage && (
                                  <div className="bg-red-50 border border-red-200 rounded p-3">
                                    <p className="text-sm font-medium text-red-900">Error</p>
                                    <p className="text-sm text-red-700">{log.errorMessage}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium mb-2">Headers</p>
                                  <pre className="text-xs bg-background border rounded p-2 overflow-x-auto">
                                    {JSON.stringify(log.headers, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-sm font-medium mb-2">Body</p>
                                  <pre className="text-xs bg-background border rounded p-2 overflow-x-auto">
                                    {JSON.stringify(log.body, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </TableCell>
                        </TableRow>
                      </>
                    </Collapsible>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OutboundMessagesTab() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<OutboundMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (statusFilter !== "ALL") params.append("status", statusFilter)
        
        const response = await fetch(`/api/logs/outbound?${params.toString()}`, { cache: "no-store" })
        
        if (!response.ok) {
          throw new Error("Failed to fetch outbound messages")
        }

        const data = await response.json()
        if (data.success && data.messages) {
          setMessages(data.messages)
        }
      } catch (error) {
        console.error("Failed to load outbound messages:", error)
        toast.error("Unable to load outbound messages")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      void fetchMessages()
    }
  }, [user, statusFilter])

  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      msg.toPhone.toLowerCase().includes(query) ||
      msg.fromPhone.toLowerCase().includes(query) ||
      (msg.body && msg.body.toLowerCase().includes(query)) ||
      (msg.templateName && msg.templateName.toLowerCase().includes(query))
    )
  })

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by phone, message, or template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Template</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No outbound messages found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMessages.map((msg) => (
                    <Collapsible key={msg.id} asChild open={expandedRows.has(msg.id)}>
                      <>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(msg.id)}
                              className="h-6 w-6 p-0"
                            >
                              {expandedRows.has(msg.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(msg.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{msg.toPhone}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                msg.status === "delivered" || msg.status === "sent"
                                  ? "bg-green-100 text-green-800"
                                  : msg.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {msg.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{msg.channel || "—"}</TableCell>
                          <TableCell className="text-sm">{msg.templateName || "—"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <CollapsibleContent>
                              <div className="p-4 bg-muted/30 space-y-3">
                                {msg.errorMessage && (
                                  <div className="bg-red-50 border border-red-200 rounded p-3">
                                    <p className="text-sm font-medium text-red-900">
                                      Error {msg.errorCode ? `(${msg.errorCode})` : ""}
                                    </p>
                                    <p className="text-sm text-red-700">{msg.errorMessage}</p>
                                  </div>
                                )}
                                <div className="grid gap-3 md:grid-cols-2 text-sm">
                                  <div>
                                    <p className="font-medium">From</p>
                                    <p className="font-mono text-xs">{msg.fromPhone}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">To</p>
                                    <p className="font-mono text-xs">{msg.toPhone}</p>
                                  </div>
                                  {msg.waSid && (
                                    <div>
                                      <p className="font-medium">WhatsApp SID</p>
                                      <p className="font-mono text-xs">{msg.waSid}</p>
                                    </div>
                                  )}
                                  {msg.templateSid && (
                                    <div>
                                      <p className="font-medium">Template SID</p>
                                      <p className="font-mono text-xs">{msg.templateSid}</p>
                                    </div>
                                  )}
                                </div>
                                {msg.body && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">Message Body</p>
                                    <div className="bg-background border rounded p-3 text-sm">
                                      {msg.body}
                                    </div>
                                  </div>
                                )}
                                {msg.metadata && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">Metadata</p>
                                    <pre className="text-xs bg-background border rounded p-2 overflow-x-auto">
                                      {JSON.stringify(msg.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </TableCell>
                        </TableRow>
                      </>
                    </Collapsible>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LogsContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Logs & Audit Trail</h1>
        <p className="text-muted-foreground">View webhook logs and outbound message history</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="webhook" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhook" className="gap-2">
            <FileText className="h-4 w-4" />
            Webhook Logs
          </TabsTrigger>
          <TabsTrigger value="outbound" className="gap-2">
            <Send className="h-4 w-4" />
            Outbound Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhook">
          <WebhookLogsTab />
        </TabsContent>

        <TabsContent value="outbound">
          <OutboundMessagesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function LogsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <LogsContent />
      </DashboardLayout>
    </AuthGuard>
  )
}

