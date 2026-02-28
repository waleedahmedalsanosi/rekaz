# Admin UI Design Blueprint (Figma Spec)

## 🎨 Color Palette
- **Primary (Admin):** `#8B5CF6` (Violet 600) - Represents authority and system management.
- **Background:** `#F8F9FA` (Off-white)
- **Surface:** `#FFFFFF` (Pure White)
- **Text Primary:** `#1A1A1A`
- **Text Secondary:** `#64748B`

## 📐 Layout Structure
- **Frame Size:** Mobile (390x844px)
- **Grid:** 4-column grid, 20px margin, 16px gutter.
- **Navigation:** Bottom Navigation Bar with 3 main nodes (Dashboard, Providers, Settings).

## 🧩 Components
### 1. Stats Cards (Bento Style)
- **Corner Radius:** 32px
- **Border:** 1px solid `#F1F5F9`
- **Shadow:** `Shadow Md` (See Global Tokens)
- **Icon Container:** 40x40px, 12px radius, light background tint.
- **Interaction:** Hover triggers `Shadow Lg` and scale 1.02.

### 2. Provider List Item
- **Avatar:** 48x48px, 16px radius.
- **Typography:** 
  - Name: 14px Bold
  - Specialty: 10px Medium, Color: Secondary
- **Action:** Chevron Right icon for drill-down.
- **State:** Active state shows light violet background (`#F5F3FF`).

## 🌑 Dark Mode (Optional)
- **Bg:** `#0F172A`
- **Surface:** `#1E293B`
- **Text:** `#F8FAFC`

## 📭 Empty States
- **Illustration:** Outlined icon (Violet 200), 64px size.
- **Text:** "لا يوجد بيانات حالياً" (Body Base, Gray 400).

### 3. Revenue Chart
- **Type:** Area Chart (Smooth curve)
- **Stroke:** 4px, `#8B5CF6`
- **Fill:** Gradient from `#8B5CF6` (20% opacity) to transparent.

## 📱 Key Screens
- **Dashboard:** High-level metrics (Commissions, Active Subs, Ratings).
- **Provider Management:** List of all registered providers with their performance stats.
- **Platform Settings:** Global configuration and subscription tier management.
