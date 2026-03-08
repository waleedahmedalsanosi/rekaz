import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const SESSION_DAYS = 30;

async function createSession(userId: string) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  await db.prepare('INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?,?,?)').run(token, userId, expiresAt);
  return token;
}

async function getUserWithProvider(userId: string) {
  return db.prepare(
    `SELECT u.id, u.name, u.phone, u.email, u.role, u.avatar, p.id as provider_id
     FROM users u LEFT JOIN providers p ON p.user_id = u.id WHERE u.id = ?`
  ).get(userId) as any;
}

// ─── OTPless helpers ──────────────────────────────────────────────────────────
// When OTPLESS_CLIENT_ID + OTPLESS_CLIENT_SECRET are set, OTPs are delivered via
// WhatsApp (OTPless). Otherwise a random code is printed to the console (dev/test).
const OTPLESS_BASE = 'https://auth.otpless.app/auth/otp/v1';

async function sendOtpless(phone: string): Promise<string | null> {
  const clientId = process.env.OTPLESS_CLIENT_ID;
  const clientSecret = process.env.OTPLESS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // Normalise phone to E.164 without '+' (OTPless expects digits only, country code first)
  const normalised = phone.startsWith('0') ? `966${phone.slice(1)}` : phone.replace(/\D/g, '');

  const res = await fetch(`${OTPLESS_BASE}/send`, {
    method: 'POST',
    headers: { 'clientId': clientId, 'clientSecret': clientSecret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: normalised, otpLength: 6, channel: 'WHATSAPP', expiry: 300 }),
  });
  const data = await res.json() as any;
  if (!res.ok || !data.orderId) {
    console.error('[OTPless] send failed:', data);
    return null;
  }
  return data.orderId as string;
}

async function verifyOtpless(phone: string, orderId: string, code: string): Promise<boolean> {
  const clientId = process.env.OTPLESS_CLIENT_ID;
  const clientSecret = process.env.OTPLESS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return false;

  const normalised = phone.startsWith('0') ? `966${phone.slice(1)}` : phone.replace(/\D/g, '');

  const res = await fetch(`${OTPLESS_BASE}/verify`, {
    method: 'POST',
    headers: { 'clientId': clientId, 'clientSecret': clientSecret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: normalised, otp: code, orderId }),
  });
  const data = await res.json() as any;
  return !!data.isOTPVerified;
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 9) {
      return res.status(400).json({ error: 'رقم الجوال غير صحيح' });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const orderId = await sendOtpless(phone);
    if (orderId) {
      // Store orderId in the code column — verified via OTPless API on verify-otp
      await db.prepare('INSERT OR REPLACE INTO otp_codes (phone, code, expires_at) VALUES (?,?,?)').run(phone, orderId, expiresAt);
      res.json({ success: true, message: 'تم إرسال رمز التحقق عبر واتساب', via: 'whatsapp' });
    } else {
      // Fallback: random 4-digit code printed to console (dev / OTPless not configured)
      // Demo phones always get code 1234 for easy testing
      const DEMO_PHONES = ['0555123456', '0501234567', '0555234567', '0555345678'];
      const code = DEMO_PHONES.includes(phone) ? '1234' : Math.floor(1000 + Math.random() * 9000).toString();
      console.log(`[OTP] Phone: ${phone} → Code: ${code}`);
      await db.prepare('INSERT OR REPLACE INTO otp_codes (phone, code, expires_at) VALUES (?,?,?)').run(phone, code, expiresAt);
      res.json({ success: true, message: 'تم إرسال رمز التحقق', via: 'console' });
    }
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code, role, name, specialty, city } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'بيانات ناقصة' });

    // Check for a stored record (contains either an orderId or a local code)
    const otpRecord = await db.prepare(
      `SELECT * FROM otp_codes WHERE phone = ? AND expires_at > datetime('now')`
    ).get(phone) as any;

    if (!otpRecord) return res.status(400).json({ error: 'رمز التحقق غير صحيح أو منتهي' });

    // If OTPless is configured, verify via API (the stored "code" is the orderId)
    const useOtpless = !!(process.env.OTPLESS_CLIENT_ID && process.env.OTPLESS_CLIENT_SECRET);
    let verified = false;
    if (useOtpless) {
      verified = await verifyOtpless(phone, otpRecord.code, code);
    } else {
      verified = otpRecord.code === code;
    }

    if (!verified) return res.status(400).json({ error: 'رمز التحقق غير صحيح أو منتهي' });

    await db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone);

    let user = await db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;

    if (!user) {
      const userId = randomUUID();
      const userRole = role === 'provider' ? 'PROVIDER' : 'CLIENT';
      const userName = name || (role === 'provider' ? 'مبدعة جديدة' : 'عميلة جديدة');
      await db.prepare('INSERT INTO users (id, name, phone, role) VALUES (?,?,?,?)').run(userId, userName, phone, userRole);

      if (userRole === 'PROVIDER') {
        const providerId = randomUUID();
        await db.prepare(
          'INSERT INTO providers (id, user_id, specialty, city) VALUES (?,?,?,?)'
        ).run(providerId, userId, specialty || '', city || '');
        await db.prepare('INSERT INTO wallets (id, provider_id) VALUES (?,?)').run(randomUUID(), providerId);

        // Register in .NET as a Merchant so bookings + escrow work for this provider
        const dotnetOrigin = process.env.DOTNET_API_URL || 'http://localhost:5000';
        fetch(`${dotnetOrigin}/api/merchants/ensure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerRefId: providerId, businessName: userName }),
        }).catch(() => { /* non-critical — .NET may be offline; merchant will sync later */ });
      }

      user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'استخدم صفحة دخول المسؤولين' });
    } else if (role === 'provider' && user.role !== 'PROVIDER') {
      // Allow CLIENT → PROVIDER upgrade (user is becoming a provider)
      await db.prepare('UPDATE users SET role = ? WHERE id = ?').run('PROVIDER', user.id);

      // Check if provider record exists; if not, create it
      const existingProvider = await db.prepare('SELECT id FROM providers WHERE user_id = ?').get(user.id) as any;
      if (!existingProvider) {
        const providerId = randomUUID();
        const userName = name || user.name || 'مبدعة جديدة';
        await db.prepare(
          'INSERT INTO providers (id, user_id, specialty, city) VALUES (?,?,?,?)'
        ).run(providerId, user.id, specialty || '', city || '');
        await db.prepare('INSERT INTO wallets (id, provider_id) VALUES (?,?)').run(randomUUID(), providerId);

        const dotnetOrigin = process.env.DOTNET_API_URL || 'http://localhost:5000';
        fetch(`${dotnetOrigin}/api/merchants/ensure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerRefId: providerId, businessName: userName }),
        }).catch(() => { /* non-critical */ });
      }

      user = await db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    const token = await createSession(user.id);
    const full = await getUserWithProvider(user.id);

    res.json({
      token,
      user: {
        id: full.id,
        name: full.name,
        phone: full.phone,
        email: full.email,
        role: full.role,
        avatar: full.avatar,
        providerId: full.provider_id || undefined,
      },
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { password } = req.body;
    const adminPw = process.env.ADMIN_PASSWORD || 'admin';
    if (password !== adminPw) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
    const admin = await db.prepare(`SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1`).get() as any;
    if (!admin) return res.status(500).json({ error: 'حساب المسؤول غير موجود' });

    const token = await createSession(admin.id);
    res.json({
      token,
      user: { id: admin.id, name: admin.name, phone: admin.phone, email: admin.email, role: admin.role, avatar: admin.avatar },
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/auth/me — validate token, return current user
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const full = await getUserWithProvider(req.userId!);
    if (!full) return res.status(401).json({ error: 'المستخدم غير موجود' });
    res.json({
      id: full.id,
      name: full.name,
      phone: full.phone,
      email: full.email,
      role: full.role,
      avatar: full.avatar,
      providerId: full.provider_id || undefined,
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/auth/me — update current user profile (any role)
router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, phone } = req.body;
    if (!name && !phone) return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });

    await db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
      .run(name || null, phone || null, req.userId);

    const full = await getUserWithProvider(req.userId!);
    res.json({
      id: full.id, name: full.name, phone: full.phone, email: full.email,
      role: full.role, avatar: full.avatar, providerId: full.provider_id || undefined,
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      await db.prepare('DELETE FROM sessions WHERE token = ?').run(header.slice(7));
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

export default router;
