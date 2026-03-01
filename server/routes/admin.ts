import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalBookings = ((await db.prepare(`SELECT COUNT(*) as c FROM bookings`).get()) as any).c;
    const paidBookings = await db.prepare(`SELECT SUM(total_price) as total, SUM(commission) as commission FROM bookings WHERE payment_status = 'PAID'`).get() as any;
    const providerCount = ((await db.prepare(`SELECT COUNT(*) as c FROM providers`).get()) as any).c;
    const avgRating = ((await db.prepare(`SELECT AVG(rating) as r FROM reviews`).get()) as any).r;
    const openDisputes = ((await db.prepare(`SELECT COUNT(*) as c FROM disputes WHERE status = 'OPEN'`).get()) as any).c;
    const pendingPayouts = ((await db.prepare(`SELECT COUNT(*) as c FROM payout_requests WHERE status = 'PENDING'`).get()) as any).c;
    const subscriptions = ((await db.prepare(`SELECT COUNT(*) as c FROM providers WHERE subscription_tier != 'FREE'`).get()) as any).c;

    const topProviders = await db.prepare(
      `SELECT p.id, u.name, p.specialty, p.rating, p.review_count, p.subscription_tier, p.is_verified,
         COALESCE(SUM(b.service_price), 0) as total_income
       FROM providers p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN bookings b ON b.provider_id = p.id AND b.payment_status = 'PAID'
       GROUP BY p.id ORDER BY total_income DESC LIMIT 5`
    ).all() as any[];

    res.json({
      totalBookings,
      totalSales: paidBookings.total || 0,
      totalCommissions: paidBookings.commission || 0,
      providerCount,
      platformRating: Math.round((avgRating || 0) * 10) / 10,
      openDisputes,
      pendingPayouts,
      activeSubscriptions: subscriptions,
      topProviders: topProviders.map(p => ({
        id: p.id, name: p.name, specialty: p.specialty,
        rating: p.rating, reviewCount: p.review_count,
        subscriptionTier: p.subscription_tier?.toLowerCase(),
        isVerified: !!p.is_verified, totalIncome: p.total_income,
      })),
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/admin/providers
router.get('/providers', requireAdmin, async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT p.*, u.name, u.avatar, u.phone FROM providers p JOIN users u ON u.id = p.user_id ORDER BY p.rating DESC`
    ).all() as any[];
    res.json(rows.map(p => ({
      id: p.id, name: p.name, specialty: p.specialty, rating: p.rating,
      avatar: p.avatar, city: p.city, bio: p.bio,
      coveredNeighborhoods: JSON.parse(p.covered_neighborhoods || '[]'),
      isVerified: !!p.is_verified, subscriptionTier: p.subscription_tier?.toLowerCase(),
      reviewCount: p.review_count, phone: p.phone,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/admin/providers/:id/verify
router.patch('/providers/:id/verify', requireAdmin, async (req, res) => {
  try {
    const provider = await db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id) as any;
    if (!provider) return res.status(404).json({ error: 'المبدعة غير موجودة' });

    const newVal = provider.is_verified ? 0 : 1;
    await db.prepare('UPDATE providers SET is_verified = ? WHERE id = ?').run(newVal, req.params.id);
    res.json({ isVerified: !!newVal });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/admin/disputes
router.get('/disputes', requireAdmin, async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT d.*,
         u_c.name as client_name, u_c.phone as client_phone,
         u_p.name as provider_name, u_p.phone as provider_phone
       FROM disputes d
       JOIN users u_c ON u_c.id = d.client_id
       JOIN providers p ON p.id = d.provider_id
       JOIN users u_p ON u_p.id = p.user_id
       ORDER BY d.created_at DESC`
    ).all() as any[];

    res.json(rows.map(d => ({
      id: d.id, bookingId: d.booking_id, reason: d.reason,
      status: d.status, resolution: d.resolution,
      clientId: d.client_id, providerId: d.provider_id,
      clientName: d.client_name, clientPhone: d.client_phone,
      providerName: d.provider_name, providerPhone: d.provider_phone,
      createdAt: d.created_at,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/admin/disputes/:id
router.patch('/disputes/:id', requireAdmin, async (req, res) => {
  try {
    const { resolution, favorClient } = req.body;
    const dispute = await db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id) as any;
    if (!dispute) return res.status(404).json({ error: 'النزاع غير موجود' });

    await db.prepare('UPDATE disputes SET status = ?, resolution = ? WHERE id = ?').run('RESOLVED', resolution || '', req.params.id);

    if (favorClient) {
      await db.prepare(`UPDATE bookings SET payment_status = 'REFUNDED', status = 'CANCELLED' WHERE id = ?`).run(dispute.booking_id);
    }

    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/admin/payouts
router.get('/payouts', requireAdmin, async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT pr.*, u.name as provider_name
       FROM payout_requests pr
       JOIN providers p ON p.id = pr.provider_id
       JOIN users u ON u.id = p.user_id
       ORDER BY pr.created_at DESC`
    ).all() as any[];

    res.json(rows.map(p => ({
      id: p.id, providerId: p.provider_id, providerName: p.provider_name,
      amount: p.amount, iban: p.iban, status: p.status, createdAt: p.created_at,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/admin/payouts/:id
router.patch('/payouts/:id', requireAdmin, async (req, res) => {
  try {
    const { approved } = req.body;
    const payout = await db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(req.params.id) as any;
    if (!payout) return res.status(404).json({ error: 'طلب السحب غير موجود' });

    const newStatus = approved ? 'COMPLETED' : 'REJECTED';
    await db.prepare('UPDATE payout_requests SET status = ? WHERE id = ?').run(newStatus, req.params.id);

    if (!approved) {
      await db.prepare('UPDATE wallets SET balance = balance + ? WHERE provider_id = ?').run(payout.amount, payout.provider_id);
      const wallet = await db.prepare('SELECT * FROM wallets WHERE provider_id = ?').get(payout.provider_id) as any;
      if (wallet) {
        await db.prepare('INSERT INTO transactions (id,wallet_id,type,amount,status,description) VALUES (?,?,?,?,?,?)')
          .run(randomUUID(), wallet.id, 'CREDIT', payout.amount, 'COMPLETED', 'إعادة مبلغ طلب سحب مرفوض');
      }
    }

    res.json({ success: true, status: newStatus });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/admin/revenue — for charts
router.get('/revenue', requireAdmin, async (req, res) => {
  try {
    const rows = await db.prepare(
      `SELECT strftime('%Y-%m-%d', created_at) as date,
         SUM(commission) as commission, SUM(total_price) as revenue
       FROM bookings WHERE payment_status = 'PAID'
       GROUP BY date ORDER BY date DESC LIMIT 30`
    ).all() as any[];

    res.json(rows.map(r => ({
      date: r.date, commission: r.commission || 0, revenue: r.revenue || 0,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

export default router;
