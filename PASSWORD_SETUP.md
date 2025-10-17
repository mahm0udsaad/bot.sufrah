# 🔐 Admin Password Protection Setup

## Overview

Both admin pages (`/admin` and `/admin/bots`) are now protected with a password authentication system. Users must enter the admin password before accessing sensitive administrative data.

## Quick Setup

### 1. Add Password to Environment

Add this line to your `.env` file:

```bash
ADMIN_PASSWORD="YourSecurePasswordHere123!"
```

⚠️ **Important**: 
- Use a strong password (mix of letters, numbers, and symbols)
- Never commit your `.env` file to version control
- Keep this password secure and only share with authorized administrators

### 2. Restart Your Server

After adding the password, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
# or
pnpm dev
```

## What's Protected

### 📊 `/admin` - Restaurant Approvals
- View pending restaurant onboarding requests
- Approve or reject restaurants
- View restaurant details and Twilio configuration
- **Arabic RTL Interface** [[memory:1354200]]

### 🤖 `/admin/bots` - Bot Management  
- Register new WhatsApp sender bots
- Edit existing bot configurations
- Delete bots (with cascade warnings)
- Quick-fill templates for known senders
- **Arabic RTL Interface** [[memory:1354200]]

## Access Flow

```
User visits /admin or /admin/bots
         ↓
Check if logged in (AuthGuard)
         ↓
Check if admin role (email contains 'admin' OR phone is '+966500000000')
         ↓
Show password card
         ↓
User enters ADMIN_PASSWORD
         ↓
API verifies password (/api/admin/verify-password)
         ↓
✅ Access granted to admin page
```

## Password Card UI

When accessing an admin page, users see:

```
┌──────────────────────────────┐
│         🔒                    │
│   لوحة التحكم الإدارية       │
│                               │
│ الرجاء إدخال كلمة مرور       │
│ الإدارة للوصول إلى البيانات  │
│                               │
│ ┌──────────────────────────┐ │
│ │ كلمة المرور              │ │
│ │ [••••••••••••••••••]     │ │
│ └──────────────────────────┘ │
│                               │
│ ┌──────────────────────────┐ │
│ │   🛡️ تسجيل الدخول      │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

## Security Features

✅ **Environment-based**: Password stored in `.env` (not hardcoded)  
✅ **Multi-layer Protection**: Login + Admin Role + Password  
✅ **Password Hidden**: Input field type is "password"  
✅ **Session-based**: Password verified per session  
✅ **Error Messages**: Clear feedback in Arabic  
✅ **Auto-focus**: Password input auto-focused for quick entry  

## Admin Role Check

Users must meet ONE of these criteria to even see the password prompt:

1. Email contains `'admin'` (e.g., `admin@sufrah.sa`)
2. Phone number is `'+966500000000'` (configurable)

You can modify this logic in:
- `/app/admin/page.tsx` (line 80)
- `/app/admin/bots/page.tsx` (line 31)
- `/components/dashboard-layout.tsx` (line 42)

## API Endpoint

### `/api/admin/verify-password`

**Method:** POST  
**Body:**
```json
{
  "password": "your-password"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "كلمة المرور غير صحيحة"
}
```

## Testing

### Test the Password Protection

1. **Visit** `/admin` or `/admin/bots`
2. **You should see** the password card (if you're an admin user)
3. **Enter** your `ADMIN_PASSWORD`
4. **Click** "تسجيل الدخول"
5. **Success!** You'll see the admin interface

### Common Issues

#### ❌ "Admin password not configured"
**Solution:** Add `ADMIN_PASSWORD` to your `.env` file and restart the server

#### ❌ "كلمة المرور غير صحيحة" (Password incorrect)
**Solution:** 
- Verify the password in your `.env` file
- Check for extra spaces or quotes
- Password is case-sensitive

#### ❌ Can't see the password card
**Solution:** 
- Ensure you're logged in
- Check if your email contains 'admin' or phone is '+966500000000'
- Modify admin check logic if needed

#### ❌ Page keeps loading
**Solution:**
- Check browser console for errors
- Verify the API endpoint `/api/admin/verify-password` is working
- Check server logs

## Customization

### Change Admin Phone Number

Edit the admin check in all three files:

```typescript
// Change this line:
const isAdmin = user?.email?.includes('admin') || user?.phone_number === '+966500000000'

// To your admin phone:
const isAdmin = user?.email?.includes('admin') || user?.phone_number === '+966XXXXXXXXX'
```

### Add Multiple Admin Phones

```typescript
const adminPhones = ['+966500000000', '+966501234567', '+966509876543']
const isAdmin = user?.email?.includes('admin') || (user?.phone_number && adminPhones.includes(user.phone_number))
```

### Change Password Requirement

You can add additional checks:

```typescript
// Require both email AND phone
const isAdmin = user?.email?.includes('admin') && user?.phone_number === '+966500000000'

// Check for specific emails
const adminEmails = ['admin@sufrah.sa', 'superadmin@sufrah.sa']
const isAdmin = user?.email && adminEmails.includes(user.email)
```

## Security Best Practices

1. ✅ **Strong Password**: Use at least 12 characters with mix of uppercase, lowercase, numbers, and symbols
2. ✅ **Regular Rotation**: Change admin password every 3-6 months
3. ✅ **Limited Sharing**: Only share with essential personnel
4. ✅ **Monitor Access**: Check server logs for unauthorized attempts
5. ✅ **Secure Storage**: Keep `.env` file secure, never commit to git
6. ✅ **Different Passwords**: Use unique passwords for dev/staging/production

## Files Modified

### Created:
- `/app/api/admin/verify-password/route.ts` - Password verification endpoint
- `/PASSWORD_SETUP.md` - This documentation

### Modified:
- `/app/admin/page.tsx` - Added password protection + Arabic UI
- `/app/admin/bots/page.tsx` - Added password protection + Arabic UI
- `/components/dashboard-layout.tsx` - Added admin navigation section

## Example .env File

```bash
# Admin Password
ADMIN_PASSWORD="MyS3cure!Adm1nP@ssw0rd"

# Database
DATABASE_URL="file:./prisma/dev.db"

# Twilio (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

## Support

If you encounter issues:
1. Check this documentation
2. Review browser console for errors
3. Check server logs
4. Verify `.env` file is properly formatted
5. Ensure server was restarted after changes

---

✅ **Implementation Complete!**  
Both admin pages are now secured with password protection and beautiful Arabic RTL interface.

