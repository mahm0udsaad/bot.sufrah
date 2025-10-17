# Admin Bot Management Setup Guide

## Overview

This dashboard includes an admin interface for registering and managing multiple WhatsApp sender bots that are configured in Twilio. The admin page is password-protected for security.

## Setup Instructions

### 1. Configure Admin Password

Add the following to your `.env` file:

```bash
ADMIN_PASSWORD="your-secure-password-here"
```

⚠️ **Important**: Use a strong password and keep it secure. This password protects access to bot registration and management.

### 2. Access the Admin Page

1. Navigate to `/admin/bots` in your dashboard
2. Enter the admin password when prompted
3. You'll have access to bot management features

### 3. Admin Access Requirements

To access the admin page, users must:
- Be logged in to the dashboard
- Have admin privileges (email contains 'admin' or specific phone number)
- Enter the correct admin password

### 4. Register a New Bot

The admin interface provides:

#### Quick-Fill Options
- **Sufrah Restaurant**: Pre-fills known configuration
- **Ocean Restaurant**: Pre-fills known configuration

You only need to add:
- Twilio Account SID
- Twilio Auth Token

#### Manual Registration
Fill all required fields:
- Bot Name (internal identifier)
- Restaurant Name (customer-facing)
- WhatsApp Number (format: `whatsapp:+966508034010`)
- Twilio Account SID
- Twilio Auth Token
- Optional: Sender SID, WABA ID, Support Contact, Payment Link

### 5. Environment Variables

```bash
# Required for admin access
ADMIN_PASSWORD="your-secure-password"

# Required for database
DATABASE_URL="file:./prisma/dev.db"

# Optional: Bot API base URL (if different from default)
NEXT_PUBLIC_BOT_API_URL="https://bot.sufrah.sa"
```

## Known Senders

### Sufrah Restaurant
- **Name**: Sufrah Bot
- **Restaurant**: Sufrah
- **WhatsApp**: whatsapp:+966508034010
- **Sender SID**: XE23c4f8b55966a1bfd101338f4c68b8cb
- **WABA ID**: 777730705047590
- **Support**: info@sufrah.sa

### Ocean Shawarma & Falafel Restaurant
- **Name**: Ocean Restaurant Bot
- **Restaurant**: مطعم شاورما وفلافل أوشن
- **WhatsApp**: whatsapp:+966502045939
- **Sender SID**: XE803ebc75db963fdfa0e813d6f4f001f6
- **WABA ID**: 777730705047590

## API Endpoints

All bot management endpoints are at: `https://bot.sufrah.sa/api/admin/bots`

- `GET /api/admin/bots` - List all bots
- `GET /api/admin/bots/:id` - Get specific bot
- `POST /api/admin/bots` - Create new bot
- `PUT /api/admin/bots/:id` - Update bot
- `DELETE /api/admin/bots/:id` - Delete bot

## Security Best Practices

1. **Strong Password**: Use a complex password with letters, numbers, and symbols
2. **Environment Security**: Never commit `.env` files to version control
3. **Access Control**: Only share admin password with authorized personnel
4. **Regular Rotation**: Change admin password periodically
5. **Twilio Credentials**: Keep Twilio credentials secure and separate per bot

## Troubleshooting

### "Admin password not configured"
- Ensure `ADMIN_PASSWORD` is set in your `.env` file
- Restart the Next.js server after adding the variable

### "Password is incorrect"
- Verify the password in your `.env` file
- Check for extra spaces or special characters
- Password is case-sensitive

### "Failed to fetch bots"
- Verify bot API is running at `https://bot.sufrah.sa`
- Check network connectivity
- Review bot API logs for errors

### "Failed to create bot"
- Verify all required fields are filled
- Check Twilio credentials are valid
- Ensure WhatsApp number format is correct
- Review API error message for details

## Support

For issues or questions:
- Check backend logs: `https://bot.sufrah.sa/api/logs`
- Review Twilio console for sender status
- Verify webhook configuration
- Contact system administrator

## Testing

### Test Admin Login
1. Navigate to `/admin/bots`
2. Enter your admin password
3. Verify access to bot management interface

### Test Bot Registration
```bash
# Using curl to test the API directly
curl -X POST https://bot.sufrah.sa/api/admin/bots \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Bot",
    "restaurantName": "Test Restaurant",
    "whatsappNumber": "whatsapp:+966500000000",
    "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "authToken": "your-auth-token",
    "status": "ACTIVE"
  }'
```

## Next Steps

After registering a bot:
1. ✅ Verify bot status is "Active"
2. ✅ Test sending a WhatsApp message
3. ✅ Configure webhooks in Twilio console
4. ✅ Monitor bot logs for incoming messages
5. ✅ Update rate limits if needed

