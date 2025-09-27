# Bot API Integration Requirements

## Overview
This document outlines the API communication requirements between the Sufrah Dashboard and the WhatsApp Bot API.

## Bot API Base URL
\`\`\`
https://bot.sufrah.sa
\`\`\`

## Authentication
<!-- Updated authentication to use personal token instead of JWT -->
**Method:** Bearer Token Authentication
**Header:** `Authorization: Bearer {BOT_API_TOKEN}`
**Environment Variable:** `BOT_API_TOKEN`

All API requests must include the personal token in the Authorization header.

## Required API Endpoints (Bot Side)

### 1. Get Conversations
**Endpoint:** `GET /api/conversations`
**Purpose:** Fetch all active conversations
**Headers:**
\`\`\`
Authorization: Bearer {BOT_API_TOKEN}
Content-Type: application/json
ngrok-skip-browser-warning: true
\`\`\`
**Response:**
\`\`\`json
[
  {
    "id": "string",
    "customer_phone": "string",
    "customer_name": "string",
    "status": "active|closed",
    "last_message_at": "ISO_DATE",
    "unread_count": "number"
  }
]
\`\`\`

### 2. Get Messages
**Endpoint:** `GET /api/conversations/{id}/messages`
**Purpose:** Fetch messages for a specific conversation
**Headers:**
\`\`\`
Authorization: Bearer {BOT_API_TOKEN}
Content-Type: application/json
ngrok-skip-browser-warning: true
\`\`\`
**Response:**
\`\`\`json
[
  {
    "id": "string",
    "conversation_id": "string",
    "from_phone": "string",
    "to_phone": "string",
    "message_type": "text|image|document|audio",
    "content": "string",
    "media_url": "string|null",
    "timestamp": "ISO_DATE",
    "is_from_customer": "boolean"
  }
]
\`\`\`

### 3. Send Message
**Endpoint:** `POST /api/conversations/{id}/send`
**Purpose:** Send message through bot to customer
**Headers:**
\`\`\`
Authorization: Bearer {BOT_API_TOKEN}
Content-Type: application/json
ngrok-skip-browser-warning: true
\`\`\`
**Request Body:**
\`\`\`json
{
  "message": "string"
}
\`\`\`

### 4. Toggle Bot Status
**Endpoint:** `POST /api/bot/toggle`
**Purpose:** Enable/disable bot responses
**Headers:**
\`\`\`
Authorization: Bearer {BOT_API_TOKEN}
Content-Type: application/json
ngrok-skip-browser-warning: true
\`\`\`
**Request Body:**
\`\`\`json
{
  "enabled": "boolean"
}
\`\`\`

## WebSocket Connection (Real-time Updates)
<!-- Added WebSocket documentation for real-time updates -->
**Endpoint:** `wss://a12ea6a3e28e.ngrok-free.app/ws?token={BOT_API_TOKEN}`
**Purpose:** Real-time updates for conversations, messages, and bot status

### WebSocket Message Types

#### Conversation Update
\`\`\`json
{
  "type": "conversation_update",
  "conversation": {
    "id": "string",
    "customer_phone": "string",
    "customer_name": "string",
    "status": "active|closed",
    "last_message_at": "ISO_DATE",
    "unread_count": "number"
  }
}
\`\`\`

#### Message Update
\`\`\`json
{
  "type": "message_update",
  "message": {
    "id": "string",
    "conversation_id": "string",
    "from_phone": "string",
    "to_phone": "string",
    "message_type": "text|image|document|audio",
    "content": "string",
    "media_url": "string|null",
    "timestamp": "ISO_DATE",
    "is_from_customer": "boolean"
  }
}
\`\`\`

#### Bot Status Update
\`\`\`json
{
  "type": "bot_status_update",
  "status": {
    "enabled": "boolean"
  }
}
\`\`\`

## Required Webhook (Dashboard Side)

### Message Webhook
**Endpoint:** `POST /api/bot/webhook`
**Purpose:** Receive new messages from bot
**Expected Payload:**
\`\`\`json
{
  "conversation_id": "string",
  "from_phone": "string",
  "to_phone": "string",
  "message_type": "text|image|document|audio",
  "content": "string",
  "media_url": "string|null",
  "timestamp": "ISO_DATE",
  "is_from_customer": "boolean"
}
\`\`\`

## Integration Notes

1. **Authentication:** All requests require Bearer token authentication using `BOT_API_TOKEN`
2. **Headers Required:** Include `ngrok-skip-browser-warning: true` for ngrok requests
3. **Error Handling:** Dashboard falls back to dummy data if bot API is unavailable
4. **Real-time Updates:** WebSocket connection provides live updates for conversations and messages
5. **CORS:** Bot API should handle CORS headers for dashboard requests
6. **Reconnection:** WebSocket client implements automatic reconnection with exponential backoff

## Environment Variables Required

### Dashboard Side
\`\`\`
BOT_API_TOKEN=your-personal-token-here
\`\`\`

### Bot Side
\`\`\`
DASHBOARD_WEBHOOK_URL=https://your-dashboard.vercel.app/api/bot/webhook
\`\`\`

## Future Integrations (Dummy Data For Now)

### Company Data API
- Restaurant profile information
- Menu items and pricing
- Business hours and settings

### Order Management API  
- Order creation and updates
- Order status tracking
- Payment processing integration

### Analytics API
- Usage statistics
- Performance metrics
- Customer insights
