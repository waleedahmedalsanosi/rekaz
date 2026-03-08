import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
const COMMISSION_RATE = 0.02;

function formatBooking(b: any) {
  return {
    id: b.id,
    customerId: b.customer_id,
    customerName: b.customer_name,
    serviceId: b.service_id,
    serviceName: b.service_name,
    providerId: b.provider_id,
    providerName: b.provider_name,
    date: b.date,
    time: b.time,
    status: b.status,
    paymentStatus: b.payment_status,
    servicePrice: b.service_price,
    commission: b.commission,
    totalPrice: b.total_price,
    neighborhood: b.neighborhood,
    clientConfirmed: !!b.client_confirmed,
    providerConfirmed: !!b.provider_confirmed,
    reviewId: b.review_id,
    disputeId: b.dispute_id,
    createdAt: b.created_at,
  };
}

const bookingQuery = `
  SELECT b.*,
    u_c.name as customer_name,
    u_p.name as provider_name,
    s.name as service_name
  FROM bookings b
  JOIN users u_c ON u_c.id = b.customer_id
  JOIN providers pr ON pr.id = b.provider_id
  JOIN users u_p ON u_p.id = pr.user_id
  JOIN services s ON s.id = b.service_id
`;

// GET /api/bookings
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    let rows: any[];
    if (req.userRole === 'ADMIN') {
      rows = await db.prepare(`${bookingQuery} ORDER BY b.created_at DESC`).all();
    } else if (req.userRole === 'PROVIDER') {
      rows = await db.prepare(`${bookingQuery} WHERE b.provider_id = ? ORDER BY b.date DESC, b.time DESC`).all(req.providerId);
    } else {
      rows = await db.prepare(`${bookingQuery} WHERE b.customer_id = ? ORDER BY b.date DESC, b.time DESC`).all(req.userId);
    }
    res.json(rows.map(formatBooking));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/bookings
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'CLIENT') return res.status(403).json({ error: 'للعملاء فقط' });

    const { serviceId, providerId, date, time, neighborhood } = req.body;
    if (!serviceId || !providerId || !date || !time) return res.status(400).json({ error: 'بيانات ناقصة' });

    const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId) as any;
    if (!service) return res.status(404).json({ error: 'الخدمة غير موجودة' });

    const commission = Math.round(service.price * COMMISSION_RATE * 100) / 100;
    const totalPrice = service.price + commission;
    const id = randomUUID();

    await db.prepare(
      `INSERT INTO bookings (id,customer_id,service_id,provider_id,date,time,neighborhood,service_price,commission,total_price)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(id, req.userId, serviceId, providerId, date, time, neighborhood || '', service.price, commission, totalPrice);

    const row = await db.prepare(`${bookingQuery} WHERE b.id = ?`).get(id) as any;
    res.status(201).json(formatBooking(row));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/bookings/:id/status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'DISPUTED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'حالة غير صحيحة' });

    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!booking) return res.status(404).json({ error: 'الحجز غير موجود' });

    if (req.userRole === 'PROVIDER' && booking.provider_id !== req.providerId) {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    if (req.userRole === 'CLIENT' && booking.customer_id !== req.userId) {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, req.params.id);

    if (status === 'COMPLETED' && req.userRole === 'PROVIDER') {
      const wallet = await db.prepare('SELECT * FROM wallets WHERE provider_id = ?').get(booking.provider_id) as any;
      if (wallet) {
        const providerEarnings = booking.service_price;
        await db.prepare(
          'UPDATE wallets SET balance = balance + ?, pending_balance = MAX(0, pending_balance - ?) WHERE provider_id = ?'
        ).run(providerEarnings, booking.service_price, booking.provider_id);
      }
    }

    const row = await db.prepare(`${bookingQuery} WHERE b.id = ?`).get(req.params.id) as any;
    res.json(formatBooking(row));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/bookings/:id/pay
router.patch('/:id/pay', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'CLIENT') return res.status(403).json({ error: 'للعملاء فقط' });

    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ? AND customer_id = ?').get(req.params.id, req.userId) as any;
    if (!booking) return res.status(404).json({ error: 'الحجز غير موجود' });
    if (booking.payment_status === 'PAID') return res.status(400).json({ error: 'تم الدفع مسبقاً' });

    await db.prepare('UPDATE bookings SET payment_status = ? WHERE id = ?').run('PAID', req.params.id);

    const wallet = await db.prepare('SELECT * FROM wallets WHERE provider_id = ?').get(booking.provider_id) as any;
    if (wallet) {
      const txId = randomUUID();
      await db.prepare('UPDATE wallets SET pending_balance = pending_balance + ?, total_earned = total_earned + ? WHERE provider_id = ?')
        .run(booking.service_price, booking.service_price, booking.provider_id);
      await db.prepare('INSERT INTO transactions (id,wallet_id,booking_id,type,amount,description) VALUES (?,?,?,?,?,?)')
        .run(txId, wallet.id, booking.id, 'CREDIT', booking.service_price, `حجز #${booking.id.slice(0,8)} - دفعة عميلة`);
    }

    const row = await db.prepare(`${bookingQuery} WHERE b.id = ?`).get(req.params.id) as any;
    res.json(formatBooking(row));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/bookings/:id/confirm
router.patch('/:id/confirm', requireAuth, async (req: AuthRequest, res) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!booking) return res.status(404).json({ error: 'الحجز غير موجود' });

    if (req.userRole === 'CLIENT' && booking.customer_id === req.userId) {
      await db.prepare('UPDATE bookings SET client_confirmed = 1 WHERE id = ?').run(req.params.id);
      if (booking.provider_confirmed) {
        await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('COMPLETED', req.params.id);
      }
    } else if (req.userRole === 'PROVIDER' && booking.provider_id === req.providerId) {
      await db.prepare('UPDATE bookings SET provider_confirmed = 1 WHERE id = ?').run(req.params.id);
      if (booking.client_confirmed) {
        await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('COMPLETED', req.params.id);
      }
    } else {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    const row = await db.prepare(`${bookingQuery} WHERE b.id = ?`).get(req.params.id) as any;
    res.json(formatBooking(row));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/bookings/:id/dispute — client files a dispute for a booking
router.post('/:id/dispute', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'CLIENT') return res.status(403).json({ error: 'للعملاء فقط' });

    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'يرجى ذكر سبب النزاع' });

    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ? AND customer_id = ?').get(req.params.id, req.userId) as any;
    if (!booking) return res.status(404).json({ error: 'الحجز غير موجود' });
    if (booking.status === 'DISPUTED') return res.status(400).json({ error: 'تم فتح نزاع لهذا الحجز مسبقاً' });
    if (!['CONFIRMED', 'COMPLETED'].includes(booking.status)) {
      return res.status(400).json({ error: 'لا يمكن فتح نزاع لهذا الحجز' });
    }

    const { randomUUID } = await import('crypto');
    const disputeId = randomUUID();

    await db.prepare(
      'INSERT INTO disputes (id, booking_id, reason, status, client_id, provider_id) VALUES (?,?,?,?,?,?)'
    ).run(disputeId, booking.id, reason.trim(), 'OPEN', booking.customer_id, booking.provider_id);

    await db.prepare('UPDATE bookings SET status = ?, dispute_id = ? WHERE id = ?').run('DISPUTED', disputeId, booking.id);

    res.status(201).json({ id: disputeId, bookingId: booking.id, reason: reason.trim(), status: 'OPEN' });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

export default router;
