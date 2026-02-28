# Global Design Tokens (Shared Specs)

## 📐 Spacing System (8pt Grid)
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **2xl:** 48px
- **3xl:** 64px

## 🖋️ Typography Scale (Inter / Sans-Serif)
- **Display:** 32px / Black (900) / -0.02em tracking
- **H1:** 24px / Black (900) / -0.01em tracking
- **H2:** 20px / ExtraBold (800)
- **Body Large:** 16px / Medium (500)
- **Body Base:** 14px / Regular (400)
- **Caption:** 12px / SemiBold (600)
- **Micro:** 10px / Bold (700) / Uppercase

## 🌑 Elevation & Shadows
- **Shadow Sm:** `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- **Shadow Md:** `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`
- **Shadow Lg:** `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`
- **Glass:** `backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.8);`

## ✨ Interaction States
- **Hover:** 90% brightness or subtle background shift.
- **Active/Pressed:** Scale 0.95 (95% size).
- **Disabled:** 40% opacity, `cursor: not-allowed`.
- **Focus:** 2px solid ring with 4px offset.
