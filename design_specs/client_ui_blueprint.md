# Client UI Design Blueprint (Figma Spec)

## 🎨 Color Palette
- **Primary (Client):** `#2563EB` (Blue 600) - Represents trust and reliability.
- **Background:** `#F8F9FA`
- **Surface:** `#FFFFFF`
- **Highlight:** `#F97316` (Orange) for ratings and special offers.

## 📐 Layout Structure
- **Frame Size:** Mobile (390x844px)
- **Navigation:** Bottom Navigation Bar (3 nodes: Discover, My Bookings, Profile).
- **Search Bar:** 48px height, 24px radius, centered on top.
- **Search State:** Focused state shows 2px Blue ring and expands slightly.

## 🧩 Components
### 1. Provider Discovery Card (Horizontal)
- **Avatar:** 80x80px, 24px radius, orange border.
- **Rating Badge:** 12px Bold, Star icon, Orange.
- **Interaction:** Tap/Click opens Provider Profile with shared element transition.

### 2. Service Featured Card (Vertical)
- **Cover Image:** 100% width, 128px height, 32px top radius.
- **Book Button:** 100% width, Black background, 12px radius.
- **Interaction:** Button shows "Loading" state with spinner after click.

## 💳 Checkout Flow
- **Step 1:** Date/Time selection (Bottom Sheet).
- **Step 2:** Payment Method (Apple Pay / Card).
- **Step 3:** Success Animation (Lottie-style checkmark).

### 3. Booking Status Timeline
- **Confirmed:** Green dot + line.
- **Pending:** Orange dot.

## 📱 Key Screens
- **Discovery Home:** Search + Featured Providers + Recommended Services.
- **Booking Flow:** Date/Time picker (Modal) + Payment Summary.
- **My Appointments:** List of upcoming and past services with review options.
