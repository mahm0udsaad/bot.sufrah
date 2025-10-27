# Authentication Flow Update - Merchant Validation

## 🎯 Summary

Updated the authentication flow to **validate users against the main Sufrah API before allowing registration**. This ensures only registered restaurant owners (merchants) can access the dashboard.

---

## ✨ What Changed

### **Before (Old Flow)**
```
1. User enters phone number
2. System creates user with placeholder data ("Restaurant Owner", "My Restaurant")
3. Sends WhatsApp verification code
4. After verification → Fetches merchant data from main API
5. Updates user with real data
```

**Problem**: Any phone number could create an account, even non-merchants.

---

### **After (New Flow)**
```
1. User enters phone number
2. System checks if user exists locally
   → If exists: Update verification code
   → If new: Validate with main Sufrah API first ⭐
3. If NOT a registered merchant → Show error message
4. If IS a merchant → Create user with REAL data from API
5. Send WhatsApp verification code
6. User verifies code → Set authentication cookie
```

**Benefits**:
- ✅ Only registered Sufrah merchants can access dashboard
- ✅ Users created with real merchant data from day 1
- ✅ No placeholder data
- ✅ Clear error messages for non-merchants
- ✅ Faster flow (no redundant API calls)

---

## 📝 Files Modified

### 1. `lib/db.ts`
**Updated `createUserWithRestaurant()` function**

Added support for merchant data during user creation:

```typescript
async createUserWithRestaurant(data: {
  phone: string
  name?: string              // ⭐ NEW
  email?: string             // ⭐ NEW
  verification_code?: string
  verification_expires_at?: Date
  restaurantData?: {         // ⭐ NEW
    name?: string
    description?: string
    address?: string
    isActive?: boolean
    externalMerchantId?: string
  }
})
```

**What it does**: Creates user and restaurant with real merchant data instead of placeholders.

---

### 2. `app/api/auth/signin/route.ts`
**Added merchant validation during signin**

**Key changes**:
- Imports `fetchMerchantByPhoneOrEmail` from `@/lib/merchants`
- For new users: Fetches merchant data from main Sufrah API **before** creating account
- If merchant not found: Returns error (404) with Arabic message
- If merchant found: Creates user with real data from API

**Error message for non-merchants**:
```json
{
  "success": false,
  "message": "هذا الرقم غير مسجل كمطعم في سفرة. يرجى التواصل مع الدعم."
}
```
Translation: "This number is not registered as a restaurant in Sufrah. Please contact support."

---

### 3. `app/api/auth/verify/route.ts`
**Removed redundant merchant data fetch**

**Key changes**:
- Removed `fetchMerchantByPhoneOrEmail` import (no longer needed)
- Removed merchant data sync logic (now done during signin)
- Cleaned up console logs (changed `[v0]` to `[verify]`)
- Added comment explaining the new flow

**Why**: Since we now fetch merchant data during signin, we don't need to do it again during verification.

---

## 🔧 Technical Details

### API Integration
**Main Sufrah API Endpoint**:
```
GET /api/v1/external/merchants/get-by-property?EmailOrPhone={phone}
Authorization: ApiToken {APITOKEN}
```

**Environment Variables Required**:
- `BASEURL` - Main Sufrah API base URL
- `APITOKEN` - API token for authentication

### Phone Number Handling
The system handles two phone formats for merchant lookup:
- **With +**: Uses E.164 format (e.g., `+966501234567`)
- **Without +**: Uses digits only (e.g., `966501234567`)

This ensures compatibility with how the main API expects phone numbers.

---

## 🧪 Testing the New Flow

### Test Case 1: New Merchant (Happy Path)
1. Enter phone number of **registered merchant** in Sufrah
2. System validates with main API ✅
3. Creates user with real merchant data
4. Sends WhatsApp verification code
5. Enter verification code
6. User is authenticated and redirected to dashboard

**Expected Result**: User sees their real restaurant name and data.

---

### Test Case 2: Non-Merchant (Error Path)
1. Enter phone number **NOT registered** in Sufrah
2. System validates with main API ❌
3. Shows error: "هذا الرقم غير مسجل كمطعم في سفرة"
4. User cannot proceed

**Expected Result**: Clear error message, no account created.

---

### Test Case 3: Existing User
1. Enter phone number of **existing user**
2. System skips merchant validation (already registered)
3. Sends new verification code
4. User verifies and logs in

**Expected Result**: Normal login flow for returning users.

---

## 🐛 Debugging

### Console Logs
The system now uses consistent logging prefixes:

```bash
[signin] New user detected, fetching merchant data from main API...
[signin] Merchant found, creating user with real data...
[signin] User created successfully with merchant data
[verify] Verify request - phone: +966XXXXXXXXX | code: XXXXXX
[verify] User found for verification: true
[verify] Cookie set for phone: +966XXXXXXXXX
```

### Common Issues

**Issue**: "Merchant not found" for valid restaurant
- **Check**: `BASEURL` and `APITOKEN` environment variables
- **Check**: Phone number format in main Sufrah system
- **Check**: Main API logs for request details

**Issue**: WhatsApp verification not sending
- **Check**: `BOT_API_URL` and `WHATSAPP_SEND_TOKEN` configured
- **Check**: Bot backend is running and accessible
- **Check**: Previous fix for JSON parsing applied

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Ensure `BASEURL` points to production Sufrah API
- [ ] Ensure `APITOKEN` is valid production token
- [ ] Test with real merchant phone numbers
- [ ] Test with non-merchant phone numbers (should reject)
- [ ] Verify WhatsApp messages are sending
- [ ] Check that real merchant data appears in dashboard
- [ ] Monitor logs for any merchant API errors

---

## 📊 Impact

### Security ✅
- Only registered merchants can access dashboard
- Prevents unauthorized account creation

### Data Quality ✅
- All users have real merchant data from day 1
- No placeholder data cluttering database

### User Experience ✅
- Clear error messages for non-merchants
- Faster verification flow
- Accurate restaurant information displayed

### Performance ✅
- One fewer API call during verification
- Merchant data fetched once during signup

---

## 🔄 Rollback Plan

If issues arise, you can revert to the old flow:

1. Revert `app/api/auth/signin/route.ts` to create users without merchant check
2. Revert `app/api/auth/verify/route.ts` to fetch merchant data after verification
3. Keep the updated `lib/db.ts` as it's backward compatible

---

## 📞 Support

For questions or issues:
1. Check console logs with `[signin]` and `[verify]` prefixes
2. Verify environment variables are set correctly
3. Test merchant API endpoint manually with curl:

```bash
curl -X GET "https://your-api.com/api/v1/external/merchants/get-by-property?EmailOrPhone=966501234567" \
  -H "Authorization: ApiToken YOUR_TOKEN" \
  -H "Accept: text/plain"
```

---

**Last Updated**: October 27, 2025
**Author**: AI Assistant
**Version**: 2.0

