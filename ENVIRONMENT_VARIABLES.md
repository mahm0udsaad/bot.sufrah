# Environment Variables Guide

This document explains all environment variables used in the Sufrah Dashboard application and how to configure them.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required values in `.env.local`

3. Never commit `.env.local` to version control!

## Required Variables

### Bot Server API

These variables configure the connection to your bot server backend.

#### `NEXT_PUBLIC_API_URL`
- **Description**: Base URL of your bot server API
- **Required**: Yes
- **Default**: `https://bot.sufrah.sa`
- **Example Values**:
  - Production: `https://bot.sufrah.sa`
  - Development: `http://localhost:3000`
  - Staging: `https://staging.bot.sufrah.sa`

#### `NEXT_PUBLIC_DASHBOARD_PAT`
- **Description**: Personal Access Token for restaurant owner authentication
- **Required**: Yes
- **How to Get**: Contact your bot server administrator or generate one from the admin panel
- **Example**: `pat_1234567890abcdef`
- **Security**: Keep this secret! Never expose in client-side code or commit to git

#### `NEXT_PUBLIC_RESTAURANT_ID`
- **Description**: Your restaurant's unique identifier
- **Required**: Yes
- **Example**: `rest_abc123xyz`
- **Note**: Must match the restaurant ID in the bot server database

## Optional Variables

### Admin Operations

#### `NEXT_PUBLIC_BOT_API_KEY`
- **Description**: API key for admin-level operations
- **Required**: No (only for admin features)
- **Example**: `sk_live_1234567890abcdef`
- **Used For**: Bot management, system-wide statistics, advanced features

### Database Configuration

#### `DATABASE_URL`
- **Description**: Prisma database connection string
- **Required**: Yes (for local dev with Prisma)
- **Example (SQLite)**: `file:./dev.db`
- **Example (PostgreSQL)**: `postgresql://user:password@localhost:5432/sufrah_dashboard?schema=public`

### Authentication

#### `JWT_SECRET`
- **Description**: Secret key for JWT token signing
- **Required**: Yes (if using JWT auth)
- **Example**: `super-secret-jwt-key-change-me-in-production`
- **Best Practice**: Generate a random 32+ character string

```bash
# Generate a secure secret
openssl rand -base64 32
```

### External Services

#### MinIO/S3 (Media Storage)

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=sufrah-media
MINIO_USE_SSL=false
```

- **Required**: Only if you're handling media uploads
- **Purpose**: Store images, documents, and other media
- **Alternatives**: Can use AWS S3, DigitalOcean Spaces, or any S3-compatible storage

#### Twilio (WhatsApp Integration)

```env
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

- **Required**: Only if using Twilio for WhatsApp messaging

#### WhatsApp Send API

```env
WHATSAPP_SEND_TOKEN=your-secure-whatsapp-send-token
BOT_API_URL=https://bot.sufrah.sa
```

- **Required**: Yes (for sending verification codes via WhatsApp)
- **Purpose**: Authenticates with the WhatsApp Send API endpoint
- **Security**: Keep this secret! Must match the `WHATSAPP_SEND_TOKEN` configured in your bot backend
- **Note**: The bot backend automatically handles 24-hour messaging windows and template fallbacks
- **Get From**: [Twilio Console](https://console.twilio.com/)

### Feature Flags

#### `NEXT_PUBLIC_ENABLE_REALTIME`
- **Description**: Enable/disable real-time features (WebSocket connections)
- **Type**: Boolean
- **Default**: `true`
- **Values**: `true` | `false`

#### `NEXT_PUBLIC_ENABLE_BOT_WEBSOCKET`
- **Description**: Enable/disable bot server WebSocket connection
- **Type**: Boolean
- **Default**: `true`
- **Values**: `true` | `false`

#### `NEXT_PUBLIC_ENABLE_ANALYTICS`
- **Description**: Enable/disable analytics tracking
- **Type**: Boolean
- **Default**: `false`
- **Values**: `true` | `false`

### Localization

#### `NEXT_PUBLIC_DEFAULT_LOCALE`
- **Description**: Default language for the dashboard
- **Type**: String
- **Default**: `en`
- **Values**: `en` (English) | `ar` (Arabic)

#### `NEXT_PUBLIC_SUPPORTED_LOCALES`
- **Description**: Comma-separated list of supported languages
- **Type**: String
- **Default**: `en,ar`
- **Example**: `en,ar,fr,es`

### Development & Debug

#### `NEXT_PUBLIC_DEBUG`
- **Description**: Enable debug mode with verbose logging
- **Type**: Boolean
- **Default**: `false`
- **Values**: `true` | `false`
- **Note**: Should be `false` in production

#### `NEXT_PUBLIC_LOG_LEVEL`
- **Description**: Logging verbosity level
- **Type**: String
- **Default**: `info`
- **Values**: `error` | `warn` | `info` | `debug`

#### `NEXT_PUBLIC_LOG_API_REQUESTS`
- **Description**: Log all API requests to console
- **Type**: Boolean
- **Default**: `false`
- **Values**: `true` | `false`

### Production Settings

#### `NEXT_PUBLIC_DOMAIN`
- **Description**: Production domain name
- **Type**: String
- **Example**: `dashboard.sufrah.sa`

#### `NEXT_PUBLIC_FORCE_HTTPS`
- **Description**: Redirect all HTTP traffic to HTTPS
- **Type**: Boolean
- **Default**: `false`
- **Recommendation**: `true` in production

#### `NEXT_PUBLIC_API_TIMEOUT`
- **Description**: API request timeout in milliseconds
- **Type**: Number
- **Default**: `30000` (30 seconds)
- **Example**: `60000` for 60 seconds

#### `NEXT_PUBLIC_ENABLE_RATE_LIMIT`
- **Description**: Enable API rate limiting
- **Type**: Boolean
- **Default**: `false`
- **Recommendation**: `true` in production

#### `NEXT_PUBLIC_MAX_REQUESTS_PER_MINUTE`
- **Description**: Maximum API requests per minute per user
- **Type**: Number
- **Default**: `60`
- **Example**: `100`

## Environment-Specific Configurations

### Local Development (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_DASHBOARD_PAT=dev-pat-token
NEXT_PUBLIC_RESTAURANT_ID=test-restaurant-1
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_LOG_LEVEL=debug
NEXT_PUBLIC_LOG_API_REQUESTS=true
DATABASE_URL="file:./dev.db"
```

### Production (.env.production)

```env
NEXT_PUBLIC_API_URL=https://bot.sufrah.sa
NEXT_PUBLIC_DASHBOARD_PAT=prod-pat-XXXXXXXXXX
NEXT_PUBLIC_RESTAURANT_ID=your-real-restaurant-id
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_LOG_LEVEL=error
NEXT_PUBLIC_LOG_API_REQUESTS=false
NEXT_PUBLIC_FORCE_HTTPS=true
NEXT_PUBLIC_ENABLE_RATE_LIMIT=true
DATABASE_URL="postgresql://user:password@db.example.com:5432/sufrah_prod"
```

### Staging (.env.staging)

```env
NEXT_PUBLIC_API_URL=https://staging.bot.sufrah.sa
NEXT_PUBLIC_DASHBOARD_PAT=staging-pat-XXXXXXXXXX
NEXT_PUBLIC_RESTAURANT_ID=staging-restaurant-1
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_LOG_LEVEL=info
DATABASE_URL="postgresql://user:password@staging-db.example.com:5432/sufrah_staging"
```

## Security Best Practices

### 1. Never Commit Secrets

Add to `.gitignore`:
```gitignore
.env.local
.env.production
.env.staging
.env*.local
```

### 2. Use Different Credentials Per Environment

- Development: Use test/dummy credentials
- Staging: Use staging-specific credentials
- Production: Use production credentials with strong security

### 3. Rotate Secrets Regularly

- Change `DASHBOARD_PAT` every 90 days
- Rotate database passwords quarterly
- Update API keys when team members leave

### 4. Limit Scope of Access

- Use minimum required permissions for each credential
- Create separate API keys for different environments
- Use read-only credentials where possible

### 5. Use Environment Variable Management Tools

For production deployments, consider using:
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [Doppler](https://www.doppler.com/)

## Troubleshooting

### API Connection Errors

**Problem**: "Failed to connect to API"

**Solutions**:
1. Check `NEXT_PUBLIC_API_URL` is correct
2. Verify bot server is running
3. Test API URL in browser or with curl:
   ```bash
   curl https://bot.sufrah.sa/api/health
   ```

### Authentication Errors

**Problem**: "401 Unauthorized" or "403 Forbidden"

**Solutions**:
1. Verify `NEXT_PUBLIC_DASHBOARD_PAT` is correct
2. Check token hasn't expired
3. Confirm `NEXT_PUBLIC_RESTAURANT_ID` matches your account
4. Test authentication:
   ```bash
   curl -H "Authorization: Bearer YOUR_PAT" \
        -H "X-Restaurant-Id: YOUR_RESTAURANT_ID" \
        https://bot.sufrah.sa/api/tenants/YOUR_RESTAURANT_ID/overview
   ```

### Missing Environment Variables

**Problem**: "Environment variable X is not defined"

**Solutions**:
1. Ensure `.env.local` exists
2. Check variable name spelling (case-sensitive)
3. Restart development server after adding variables:
   ```bash
   npm run dev
   ```

### Variables Not Updating

**Problem**: Changes to environment variables not taking effect

**Solutions**:
1. Restart your development server
2. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```
3. Verify you're editing the correct file (`.env.local` not `.env.example`)

## Validation

Run this script to validate your environment configuration:

```bash
#!/bin/bash
echo "Validating environment configuration..."

# Check required variables
required_vars=(
  "NEXT_PUBLIC_API_URL"
  "NEXT_PUBLIC_DASHBOARD_PAT"
  "NEXT_PUBLIC_RESTAURANT_ID"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required variable: $var"
  else
    echo "✅ $var is set"
  fi
done

echo "Validation complete!"
```

## Getting Help

If you're having trouble with environment configuration:

1. Check this documentation
2. Review the `.env.example` file
3. Contact your bot server administrator
4. Open an issue in the project repository

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Bot Server API Documentation](./DASHBOARD_API_COMPLETE_REFERENCE.md)
- [Integration Guide](./DASHBOARD_INTEGRATION_GUIDE.md)

