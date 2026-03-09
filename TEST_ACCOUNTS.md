# 🧪 Test Accounts - Ziena Beauty Services Platform

All test accounts are automatically seeded when the database is first initialized. To test the app, simply enter any of the phone numbers below and use OTP code **1234**.

## Test Accounts

### 👑 Admin: Amani
- **Phone:** +966 55 512 3456 or 0555123456
- **Name:** أماني
- **OTP Code:** 1234
- **Permissions:** Full platform access, manage providers, disputes, payouts
- **Access:** Admin dashboard with analytics, provider verification, dispute resolution

### 💅 Provider: Manal
- **Phone:** +966 50 546 7269 or 0505467269
- **Name:** منال
- **Specialty:** مكياج وتصفيف شعر (Makeup & Hair Styling)
- **OTP Code:** 1234
- **Rating:** 4.8/5
- **Verified:** ✅ Yes
- **Permissions:** Create services, manage bookings, track earnings, upload photos
- **Wallet:** Empty (gets funded on completed bookings)

### 👩 Client: Lyla
- **Phone:** +966 58 231 4923 or 0582314923
- **Name:** ليلى
- **OTP Code:** 1234
- **Permissions:** Browse providers, book services, pay, leave reviews
- **Features:** Favorites, notifications, booking history, wallet

## How to Use in Development

### Option 1: Web (Vite Dev Server)
```bash
npm start
# Or
npm run dev
```

Navigate to http://localhost:3000

Then:
1. Click "دخول بطلب سيارة" (any role)
2. Enter phone: `0555123456` (Amani/Admin)
3. Enter OTP: `1234`
4. Select role when prompted

### Option 2: Android APK (Testing)
1. Install the production APK on your device
2. Tap "تسجيل دخول" (Sign In)
3. Enter phone number from list above
4. Wait for OTP (will appear as toast notification in dev mode, or be sent via WhatsApp if OTPless is configured)
5. Enter OTP: `1234`

## Testing Flows

### Admin Testing
```
1. Log in as Amani (+966555123456)
2. Go to "لوحة التحكم" (Dashboard) → view platform stats
3. Go to "المتخصصات" (Providers) → click on Manal to verify provider
4. Go to "الحجوزات" (Bookings) → view all bookings
5. Go to "النزاعات" (Disputes) → resolve disputes if any
6. Go to "السحوبات" (Payouts) → approve/reject payout requests
```

### Provider Testing
```
1. Log in as Manal (+966505467269)
2. Go to "لوحة التحكم" (Dashboard) → view earnings
3. Go to "الحجوزات" (Bookings) → accept/reject/complete bookings
4. Go to "الخدمات" (Services) → create new service
5. Go to "المحفظة" (Wallet) → request payout
6. Go to "الإعدادات" (Settings) → upload profile photo
```

### Client Testing
```
1. Log in as Lyla (+966582314923)
2. Go to "اكتشاف" (Discover) → browse providers (Manal appears here)
3. Click on provider → view services and rating
4. Click "احجزي الآن" (Book Now) → follow booking flow
5. Go to "حجوزاتي" (My Bookings) → view/manage bookings
6. Go to "المفضلة" (Favorites) → add/remove providers
7. Go to "التنبيهات" (Notifications) → view notifications
```

## Integration Testing

### Test Payment Flow
```
1. Log in as Client (Lyla)
2. Browse and select Manal's service
3. Choose date/time
4. Proceed to payment
5. Use Moyasar test card: 4111111111111111
6. Expiry: 05/30, CVV: 123
7. Booking confirmed
```

### Test Notifications
```
1. Book a service as Client
2. Switch to Admin role (dev-only toggle)
3. View booking in admin panel
4. Accept/reject
5. Client receives notification
6. Provider can view and accept
7. Admin gets dispute alert if issue
```

## Database Reset

To reset the database and reseed test accounts:

**Development (Local SQLite):**
```bash
rm zeina.db
npm start
# App will recreate DB with test accounts
```

**Production (Turso):**
```bash
# Turso doesn't auto-reset. You can:
# 1. Clear tables via Turso dashboard
# 2. Or re-deploy with TURSO_URL pointing to new database
```

## Notes

- All test accounts are **development-only** and should be removed before public launch
- OTP code `1234` is hard-coded for demo phones in `server/routes/auth.ts`
- In production, real phone numbers and actual OTP delivery (via OTPless/WhatsApp) are used
- Manal's provider profile is pre-verified to speed up testing
- Test accounts are **not deleted** on subsequent app runs (DB already exists)

## Troubleshooting

### OTP Not Showing
- Check browser console for `[OTP] Phone: ... → Code: 1234` message
- If not showing, ensure `NODE_ENV !== 'production'` in .env
- On production APK, OTP is sent via WhatsApp if OTPless is configured

### Account Not Found
- Ensure phone is formatted correctly (include country code or leading 0)
- Both formats work: `+966555123456` and `0555123456`
- Database might not be seeded yet — restart the server

### Can't Switch Roles
- Role-switching toggle is **dev-only** (visible only when `import.meta.env.DEV`)
- To test different roles, log out and log in with different phone number

---

**Last Updated:** March 9, 2026
**Test Accounts Version:** v1.0
