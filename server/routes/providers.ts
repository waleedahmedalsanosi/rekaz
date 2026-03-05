import { Router } from 'express';
import db from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

function formatProvider(row: any) {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    rating: row.rating,
    avatar: row.avatar,
    city: row.city,
    bio: row.bio,
    coveredNeighborhoods: JSON.parse(row.covered_neighborhoods || '[]'),
    isVerified: !!row.is_verified,
    subscriptionTier: row.subscription_tier?.toLowerCase() || 'free',
    reviewCount: row.review_count,
    phone: row.phone,
    userId: row.user_id,
    workingHours: row.working_hours ? JSON.parse(row.working_hours) : null,
  };
}

// GET /api/providers
router.get('/', async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT p.*, u.name, u.avatar, u.phone FROM providers p JOIN users u ON u.id = p.user_id ORDER BY p.rating DESC`
    ).all() as any[];
    res.json(rows.map(formatProvider));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/providers/me — get own profile (must be before /:id)
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'PROVIDER') return res.status(403).json({ error: 'للمزودين فقط' });
    const row = await db.prepare(
      `SELECT p.*, u.name, u.avatar, u.phone FROM providers p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?`
    ).get(req.userId) as any;
    if (!row) return res.status(404).json({ error: 'غير موجود' });
    res.json(formatProvider(row));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/providers/me — update own profile (must be before /:id)
router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, specialty, bio, city, phone, coveredNeighborhoods, workingHours } = req.body;
    if (req.userRole !== 'PROVIDER') return res.status(403).json({ error: 'للمزودين فقط' });

    if (name || phone) {
      await db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
        .run(name || null, phone || null, req.userId);
    }

    await db.prepare(
      `UPDATE providers SET
        specialty = COALESCE(?, specialty),
        bio = COALESCE(?, bio),
        city = COALESCE(?, city),
        covered_neighborhoods = COALESCE(?, covered_neighborhoods),
        working_hours = COALESCE(?, working_hours)
       WHERE user_id = ?`
    ).run(specialty || null, bio || null, city || null,
      coveredNeighborhoods ? JSON.stringify(coveredNeighborhoods) : null,
      workingHours !== undefined ? JSON.stringify(workingHours) : null,
      req.userId);

    const row = await db.prepare(
      `SELECT p.*, u.name, u.avatar, u.phone FROM providers p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?`
    ).get(req.userId) as any;
    res.json(formatProvider(row));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/providers/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await db.prepare(
      `SELECT p.*, u.name, u.avatar, u.phone FROM providers p JOIN users u ON u.id = p.user_id WHERE p.id = ?`
    ).get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'غير موجود' });
    res.json(formatProvider(row));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/providers/:id/services
router.get('/:id/services', async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT * FROM services WHERE provider_id = ? AND is_available = 1`
    ).all(req.params.id) as any[];
    res.json(rows.map(s => ({
      id: s.id, providerId: s.provider_id, name: s.name,
      description: s.description, price: s.price, duration: s.duration,
      category: s.category, image: s.image, isAvailable: !!s.is_available,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/providers/:id/reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT r.*, u.name as customer_name, u.avatar as customer_avatar
       FROM reviews r JOIN users u ON u.id = r.customer_id
       WHERE r.provider_id = ? ORDER BY r.created_at DESC`
    ).all(req.params.id) as any[];
    res.json(rows.map(r => ({
      id: r.id, bookingId: r.booking_id, customerId: r.customer_id,
      customerName: r.customer_name, customerAvatar: r.customer_avatar,
      providerId: r.provider_id, rating: r.rating, comment: r.comment, createdAt: r.created_at,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

export default router;
