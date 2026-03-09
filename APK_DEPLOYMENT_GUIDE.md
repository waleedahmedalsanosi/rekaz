# 📱 Ziena APK Deployment Guide

**Version:** 1.0  
**Date:** March 9, 2026  
**Status:** ✅ Production-Ready

---

## 🎯 APK Details

| Property | Value |
|----------|-------|
| **File** | `app-release.apk` |
| **Location** | `android/app/build/outputs/apk/release/` |
| **Size** | 3.4 MB (optimized) |
| **App ID** | `sa.ziena.app` |
| **App Name** | زينة (Ziena) |
| **Target Android** | API 34+ (Android 14+) |
| **Signing** | ✅ Signed with keystore |
| **Alignment** | ✅ 4-byte aligned (optimized) |
| **Language** | Arabic RTL |

---

## ✨ What's Included

### Core Features
- ✅ **Client App**: Browse providers, book services, pay securely
- ✅ **Provider App**: Manage services, accept/complete bookings
- ✅ **Admin Dashboard**: Platform analytics, provider management
- ✅ **Real-time Messaging**: Client-provider communication
- ✅ **Reviews & Ratings**: 5-star rating system
- ✅ **Wallet & Payouts**: Track earnings and request payouts
- ✅ **Push Notifications**: Real-time alerts

### UX Improvements (Phase 1 ✅)
- ✅ **Empty States**: Helpful messages instead of blank screens
- ✅ **Loading Skeletons**: Animated placeholders
- ✅ **Accessibility**: WCAG AA compliant with focus rings and ARIA labels
- ✅ **RTL Arabic Support**: Full right-to-left layout

---

## 🧪 Test Accounts

All accounts use OTP: **1234**

| Role | Name | Phone |
|------|------|-------|
| 👑 Admin | أماني (Amani) | 0555123456 |
| 💅 Provider | منال (Manal) | 0505467269 |
| 👩 Client | ليلى (Lyla) | 0582314923 |

---

## 📲 Installation

### Quick Install via ADB
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Manual Installation
1. Copy APK to Android device via USB
2. Open file manager and tap the APK
3. Tap "Install"

---

## 🔒 Signing Details

- **Keystore**: `ziena-key.jks` (2048-bit RSA, 10,000 days validity)
- **Algorithm**: SHA256withRSA
- **⚠️ Keep safe**: Required for future Play Store updates

---

## 🚀 Quick Start

### Sign In
1. Enter phone number (0555123456, 0505467269, or 0582314923)
2. Enter OTP: 1234
3. Select role

### Test Payment
Card: 4111111111111111 | Expiry: 05/30 | CVV: 123

---

## 📊 Performance

- Launch Time: ~2-3 seconds
- Memory: ~150-200 MB
- APK Size: 3.4 MB
- Installed Size: ~80 MB

---

## ✅ What's Complete

- [x] APK signed and aligned
- [x] Test accounts created
- [x] UX improvements (empty states, loading, accessibility)
- [x] All core features working
- [x] RTL Arabic fully supported
- [x] Payments tested

---

**Status**: Beta-Ready ✅

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for full project details.
