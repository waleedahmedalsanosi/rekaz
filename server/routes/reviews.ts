import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/reviews
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'CLIENT') return res.status(403).json({ error: 'للعملاء فقط' });

    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) return res.status(400).json({ error: 'بيانات ناقصة' });

    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ? AND customer_id = ?').get(bookingId, req.userId) as any;
    if (!booking) return res.status(404).json({ error: 'الحجز غير موجود' });
    if (booking.review_id) return res.status(400).json({ error: 'تم تقييم هذا الحجز مسبقاً' });

    const id = randomUUID();
    await db.prepare(
      'INSERT INTO reviews (id, booking_id, customer_id, provider_id, rating, comment) VALUES (?,?,?,?,?,?)'
    ).run(id, bookingId, req.userId, booking.provider_id, rating, comment || '');

    await db.prepare('UPDATE bookings SET review_id = ? WHERE id = ?').run(id, bookingId);

    const avgRating = await db.prepare(
      'SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE provider_id = ?'
    ).get(booking.provider_id) as any;

    await db.prepare('UPDATE providers SET rating = ?, review_count = ? WHERE id = ?')
      .run(Math.round(avgRating.avg * 10) / 10, avgRating.cnt, booking.provider_id);

    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').get(id) as any;
    res.status(201).json({
      id: review.id, bookingId: review.booking_id, customerId: review.customer_id,
      providerId: review.provider_id, rating: review.rating, comment: review.comment,
      createdAt: review.created_at,
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

export default router;
