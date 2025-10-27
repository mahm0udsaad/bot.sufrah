# Testing Bot ID Fix

## What Was Fixed

The dashboard now correctly registers bots with the external bot server and uses the server's Bot ID instead of generating its own.

## Testing Checklist

### ✅ Test 1: Check Current Bot Configuration

```bash
# Check all bots in database
bun run scripts/checkBotConfig.ts

# Check specific restaurant
bun run scripts/checkBotConfig.ts +966573610338
```

**Expected Output:**
- Shows Restaurant ID and Bot ID
- Provides example API call with correct Bot ID

### ✅ Test 2: New Restaurant Onboarding

**Steps:**

1. **Start the dashboard:**
   ```bash
   bun run dev
   ```

2. **Register a new restaurant:**
   - Go to `/onboarding`
   - Enter WhatsApp number (e.g., `+966500000000`)
   - Fill in restaurant details
   - Submit the form

3. **Check the logs** for this sequence:
   ```
   [WhatsApp Start] Step 6: Register Bot with External Server
   [WhatsApp Start] 🔄 Registering bot with external server: https://bot.sufrah.sa/api/admin/bots
   [WhatsApp Start] ✓ Bot registered with external server. Bot ID: cmXXXXXXXXXXXXXXXXXX
   [WhatsApp Start] Step 7: Save to Local Database
   [WhatsApp Start] ✓ Bot saved to database: cmXXXXXXXXXXXXXXXXXX
   [WhatsApp Start] ✓ Bot ID source: external server
   ```

4. **Verify in database:**
   ```bash
   bun run scripts/checkBotConfig.ts +966500000000
   ```

5. **Test API call:**
   ```bash
   BOT_ID="<id_from_previous_step>"
   
   curl -X GET \
     "https://bot.sufrah.sa/api/tenants/${BOT_ID}/overview?currency=SAR" \
     -H "Authorization: Bearer sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM" \
     -H "X-Restaurant-Id: ${BOT_ID}"
   ```

**Expected Result:**
- ✅ Bot registered with external server (check logs)
- ✅ Local database has Bot ID from external server
- ✅ API call returns 200 OK (not 403)

### ✅ Test 3: Link Existing Bot

**Steps:**

1. **Get a Bot ID from external server:**
   ```bash
   curl -X GET \
     "https://bot.sufrah.sa/api/admin/bots" \
     -H "Authorization: Bearer sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM"
   ```

2. **Link the bot via dashboard:**
   - Go to `/onboarding`
   - Choose "Link existing bot"
   - Enter the Bot ID
   - Submit

3. **Verify the bot was linked:**
   ```bash
   bun run scripts/checkBotConfig.ts
   ```

4. **Check that local record uses external Bot ID:**
   - Local RestaurantBot.id should match the Bot ID from external server

**Expected Result:**
- ✅ Local record created with external Bot ID
- ✅ No 403 errors when making API calls

### ✅ Test 4: Dashboard API Calls

**Steps:**

1. **Login to dashboard** with a restaurant that has a bot

2. **Navigate to each page:**
   - `/` (Dashboard Overview)
   - `/orders` (Orders page)
   - `/templates` (Templates)
   - `/ratings` (Ratings)
   - `/catalog` (Catalog)

3. **Check browser DevTools Network tab:**
   - All API calls to `bot.sufrah.sa` should use same Bot ID in:
     - URL path: `/api/tenants/{botId}/...`
     - Header: `X-Restaurant-Id: {botId}`

4. **Check for errors:**
   - Should see NO 403 Forbidden errors
   - All API calls should return 200 OK

**Expected Result:**
- ✅ All pages load successfully
- ✅ No 403 errors in console
- ✅ Bot ID consistent across all API calls

### ✅ Test 5: Auth API

**Steps:**

1. **Call auth API:**
   ```bash
   curl http://localhost:3000/api/auth/me \
     -H "Cookie: user-phone=+966573610338"
   ```

2. **Check response:**
   ```json
   {
     "id": "user-id",
     "phone_number": "+966573610338",
     "name": "Restaurant Owner",
     "restaurant": {
       "id": "cmXXXXXXXXXXX",
       "name": "My Restaurant"
     },
     "tenantId": "cmh93958o0004sauw8iv09f7n"  ← Bot ID from external server
   }
   ```

**Expected Result:**
- ✅ `tenantId` field is present
- ✅ `tenantId` matches the Bot ID from external server
- ✅ `tenantId` is NOT the same as `restaurant.id`

## Common Issues & Fixes

### Issue: Bot ID is NULL

**Symptom:**
```json
{
  "tenantId": null
}
```

**Fix:**
1. Restaurant has no bot configured
2. Run onboarding flow to register bot
3. Or use link-sender to link existing bot

### Issue: Still getting 403 errors

**Check:**
1. **Bot ID in database:**
   ```bash
   bun run scripts/checkBotConfig.ts +966573610338
   ```

2. **Bot exists on external server:**
   ```bash
   curl https://bot.sufrah.sa/api/admin/bots/${BOT_ID} \
     -H "Authorization: Bearer sufrah_bot_0DJKLldY4IP7dBwEagEywUrC9Z4waN9yi3idlpMQLaM"
   ```

3. **IDs match:**
   - Local RestaurantBot.id should equal external bot.id
   - If not, delete local record and re-register

### Issue: External server registration fails

**Symptom:**
```
[WhatsApp Start] ⚠️ External bot registration failed
[WhatsApp Start] Continuing with local-only registration...
```

**Check:**
1. `BOT_API_TOKEN` environment variable is set
2. `BOT_API_URL` is correct (`https://bot.sufrah.sa/api`)
3. External bot server is running and accessible
4. API token is valid

**Fallback:**
- Dashboard will create local record with generated ID
- You can manually link to external bot later using link-sender API

## Manual Migration for Existing Bots

If you have existing restaurants with wrong Bot IDs:

### Option 1: Keep the checkBotConfig script

```bash
# Keep this script for checking configuration
# (Don't delete it, it's useful for verification)
```

### Option 2: Re-register through onboarding

1. **Delete local RestaurantBot:**
   ```sql
   DELETE FROM "RestaurantBot" WHERE "restaurant_id" = 'cmXXXXXXXXXXX';
   ```

2. **Go through onboarding flow again**
   - Dashboard will register with external server
   - Get correct Bot ID
   - Save to local database

### Option 3: Manual database update

```sql
-- If you know the correct Bot ID from external server
UPDATE "RestaurantBot" 
SET "id" = 'cmh93958o0004sauw8iv09f7n'  -- External Bot ID
WHERE "restaurant_id" = 'cmglbn6vk0002savgy9f8zo8s';
```

## Success Criteria

✅ New restaurants automatically get Bot ID from external server
✅ No 403 Forbidden errors when calling bot.sufrah.sa
✅ Bot ID is consistent in URLs and headers
✅ `tenantId` field in auth response matches external Bot ID
✅ All dashboard pages load without errors

## Next Steps

After confirming all tests pass:

1. ✅ Deploy to production
2. ✅ Monitor logs for any 403 errors
3. ✅ Migrate existing restaurants if needed
4. ✅ Update team documentation

---

**Last Updated:** October 27, 2025
**Status:** Ready for Testing

