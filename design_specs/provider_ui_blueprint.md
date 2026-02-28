# Provider UI Design Blueprint (Figma Spec)

## 🎨 Color Palette
- **Primary (Provider):** `#EA580C` (Orange 600) - Represents energy, creativity, and service.
- **Background:** `#F8F9FA`
- **Surface:** `#FFFFFF`
- **Accent:** `#10B981` (Success Green) for accepted bookings.
- **Danger:** `#EF4444` (Red) for rejections.

## 📐 Layout Structure
- **Frame Size:** Mobile (390x844px)
- **Navigation:** Bottom Navigation Bar (5 nodes: Home, Bookings, Services, Customers, Settings).
- **FAB (Floating Action Button):** 56x56px, Black, bottom-left for "Quick Booking".

## 🧩 Components
### 1. Booking Request Card
- **Status Indicator:** 2px vertical bar on the right side.
- **Action Buttons:** 
  - Accept: Green background, white text, 16px radius.
  - Reject: Light red background, red text, 16px radius.
- **Interaction:** Buttons expand slightly on hover (scale 1.05).

### 2. Service Management Card
- **Image:** 128x128px, 32px radius (Left side).
- **Price Tag:** 16px Black, Bold, Orange color.
- **Settings Icon:** Top-right for quick edit.
- **Delete Icon:** Red tint, 45-degree rotated plus icon.

## 📭 Empty States
- **Illustration:** "No Bookings" (Calendar icon with slash).
- **CTA:** "أضف خدمة جديدة للبدء" (Primary Button).

## 🔔 Notifications
- **Style:** Toast notification, top-center.
- **Color:** Orange border, white background.

### 3. Sales Area Chart
- **Stroke:** 3px, `#EA580C`
- **Tooltip:** Rounded 16px, no border, soft shadow.

## 📱 Key Screens
- **Daily Summary:** Welcome header + Quick stats + Today's bookings.
- **Service Catalog:** Grid/List of services with add/edit capabilities.
- **Customer CRM:** List of clients with quick WhatsApp contact integration.
