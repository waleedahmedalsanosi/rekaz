import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';

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

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length < 9) {
      return res.status(400).json({ error: 'رقم الجوال غير صحيح' });
    }
    const code = '1234'; // Demo: always 1234
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await db.prepare('INSERT OR REPLACE INTO otp_codes (phone, code, expires_at) VALUES (?,?,?)').run(phone, code, expiresAt);
    res.json({ success: true, message: 'تم إرسال رمز التحقق' });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code, role, name, specialty, city } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'بيانات ناقصة' });

    const otpRecord = await db.prepare(
      `SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND expires_at > datetime('now')`
    ).get(phone, code) as any;

    if (!otpRecord) return res.status(400).json({ error: 'رمز التحقق غير صحيح أو منتهي' });

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
      }

      user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'استخدم صفحة دخول المسؤولين' });
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
    if (password !== 'admin') {
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
