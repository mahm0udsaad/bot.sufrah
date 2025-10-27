# Migration Guide: Fixing Existing Restaurants

## The Problem

Existing restaurants may have **locally-generated Bot IDs** that don't match the **external bot server**. This causes 403 Forbidden errors.

## Two Solutions

### Option 1: Sync with Existing External Bot ⭐ (Recommended)

**When to use:**
- Bot already exists on external server (`bot.sufrah.sa`)
- You know the correct Bot ID from external server
- Want to keep existing restaurant data

**Steps:**

1. **Get the Bot ID from external bot server:**
   ```bash
   curl https://bot.sufrah.sa/api/admin/bots \
     -H "Authorization: Bearer sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM" \
     | jq
   ```

   Look for your restaurant by WhatsApp number and copy the `id`.

2. **Run the sync script:**
   ```bash
   bun run scripts/syncBotId.ts +966573610338 cmh93958o0004sauw8iv09f7n
   #                              ↑ WhatsApp    ↑ External Bot ID
   ```

3. **Verify the sync:**
   ```bash
   bun run scripts/checkBotConfig.ts +966573610338
   ```

4. **Test the dashboard:**
   - Login to the dashboard
   - All pages should load without 403 errors

**Example for Shawrma Karm:**
```bash
# Sync Shawrma Karm restaurant
bun run scripts/syncBotId.ts +966573610338 cmh93958o0004sauw8iv09f7n

# Output:
# ✅ Found restaurant: Shawrma Karm
# ✅ Bot found on external server
# ✅ Successfully synced!
# 🎉 Done!
```

---

### Option 2: Delete and Re-register

**When to use:**
- Bot doesn't exist on external server
- Starting fresh is easier
- OK to lose existing local data

**Steps:**

1. **Backup important data (optional):**
   ```sql
   -- Save orders, conversations, etc. if needed
   SELECT * FROM "Order" WHERE "restaurant_id" = 'your-restaurant-id';
   ```

2. **Delete the RestaurantBot:**
   ```sql
   DELETE FROM "RestaurantBot" 
   WHERE "restaurant_id" = 'your-restaurant-id';
   ```

3. **Go through onboarding again:**
   - Visit: `http://localhost:3000/onboarding`
   - Enter WhatsApp number
   - Fill in restaurant details
   - Submit

4. **The new flow will:**
   - Register bot with external server first ✅
   - Get Bot ID from external server ✅
   - Save to local database with that ID ✅

5. **Verify:**
   ```bash
   bun run scripts/checkBotConfig.ts +966573610338
   ```

---

## Quick Comparison

| Aspect | Option 1: Sync | Option 2: Re-register |
|--------|----------------|----------------------|
| **Speed** | ⚡ Fast (1 command) | Slower (manual process) |
| **Data** | ✅ Keeps local data | ⚠️ May lose local data |
| **Requirements** | Bot exists on external server | None |
| **Effort** | Low | Medium |
| **Risk** | Low | Medium |

## Recommended Approach for Each Restaurant

### Shawrma Karm (+966573610338)
```bash
# ✅ Use Option 1: Bot already exists on external server
bun run scripts/syncBotId.ts +966573610338 cmh93958o0004sauw8iv09f7n
```

### مطعم شاورما وفلافل أوشن (+966502045939)
```bash
# ✅ Use Option 1: Bot already exists on external server
bun run scripts/syncBotId.ts +966502045939 cmgz2pgvr0001kjxl19wuddsa
```

### rashad (+966508034010)
```bash
# ✅ Use Option 1: Bot already exists on external server
bun run scripts/syncBotId.ts +966508034010 cmgm28wjo0001sa9oqd57vqko
```

### مطعم سفرة التجريبي (whatsapp:+14155238886)
```bash
# ✅ Use Option 1: Bot already exists on external server
bun run scripts/syncBotId.ts +14155238886 cmgl9g79x0000satgj9v9y6ui
```

---

## Verification Steps

After using either option:

### 1. Check Bot Configuration
```bash
bun run scripts/checkBotConfig.ts +966573610338
```

**Expected output:**
```
✅ Found restaurant: Shawrma Karm
✅ Bot ID: cmh93958o0004sauw8iv09f7n ⬅️ USE THIS IN API CALLS
✅ Active: ✅
```

### 2. Test Auth API
```bash
curl http://localhost:3000/api/auth/me \
  -H "Cookie: user-phone=+966573610338"
```

**Expected response:**
```json
{
  "tenantId": "cmh93958o0004sauw8iv09f7n",  ✅ Matches external Bot ID
  "restaurant": { "id": "cmglbn6vk0002savgy9f8zo8s" }
}
```

### 3. Test External API Call
```bash
BOT_ID="cmh93958o0004sauw8iv09f7n"

curl https://bot.sufrah.sa/api/tenants/${BOT_ID}/overview?currency=SAR \
  -H "Authorization: Bearer sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM" \
  -H "X-Restaurant-Id: ${BOT_ID}"
```

**Expected:** `200 OK` with dashboard data (not 403)

### 4. Test Dashboard UI
1. Login: `http://localhost:3000/signin`
2. Enter phone: `+966573610338`
3. Navigate to:
   - `/` - Dashboard Overview
   - `/orders` - Orders
   - `/templates` - Templates
   - `/ratings` - Ratings

**Expected:** All pages load without 403 errors

---

## Troubleshooting

### Sync fails: "Bot not found on external server"

```bash
❌ Bot ID cmXXXXX not found on external server
```

**Solution:** Use Option 2 (Re-register) instead

### Still getting 403 errors after sync

**Check:**
1. Clear browser cache and cookies
2. Logout and login again
3. Verify Bot ID matches:
   ```bash
   bun run scripts/checkBotConfig.ts +966573610338
   ```
4. Check external server has the bot:
   ```bash
   curl https://bot.sufrah.sa/api/admin/bots/cmh93958o0004sauw8iv09f7n \
     -H "Authorization: Bearer sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM"
   ```

### Database constraint errors

```bash
Unique constraint failed on the fields: (`id`)
```

**Solution:** The Bot ID already exists. Delete the old record first:
```sql
DELETE FROM "RestaurantBot" WHERE "id" = 'old-bot-id';
```

Then run sync again.

---

## Summary

✅ **Recommended:** Use Option 1 (Sync) if bot exists on external server
- Fast and safe
- Keeps all data
- One command: `bun run scripts/syncBotId.ts <phone> <botId>`

⚠️ **Fallback:** Use Option 2 (Re-register) if bot doesn't exist
- Clean slate
- Automatic registration with external server
- May lose some local data

---

**Next:** See [TESTING_BOT_ID_FIX.md](./TESTING_BOT_ID_FIX.md) for complete testing checklist

