import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireProvider, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/wallet
router.get('/', requireProvider, async (req: AuthRequest, res) => {
  try {
    const wallet = await db.prepare('SELECT * FROM wallets WHERE provider_id = ?').get(req.providerId) as any;
    if (!wallet) return res.status(404).json({ error: 'المحفظة غير موجودة' });
    res.json({
      id: wallet.id, providerId: wallet.provider_id,
      balance: wallet.balance, pendingBalance: wallet.pending_balance, totalEarned: wallet.total_earned,
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/wallet/transactions
router.get('/transactions', requireProvider, async (req: AuthRequest, res) => {
  try {
    const wallet = await db.prepare('SELECT * FROM wallets WHERE provider_id = ?').get(req.providerId) as any;
    if (!wallet) return res.status(404).json({ error: 'المحفظة غير موجودة' });

    const rows = await db.prepare(
      'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(wallet.id) as any[];

    res.json(rows.map(t => ({
      id: t.id, walletId: t.wallet_id, bookingId: t.booking_id,
      type: t.type, amount: t.amount, status: t.status,
      description: t.description, createdAt: t.created_at,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/wallet/payout
router.post('/payout', requireProvider, async (req: AuthRequest, res) => {
  try {
    const { amount, iban } = req.body;
    if (!amount || !iban) return res.status(400).json({ error: 'بيانات ناقصة' });

    const wallet = await db.prepare('SELECT * FROM wallets WHERE provider_id = ?').get(req.providerId) as any;
    if (!wallet) return res.status(404).json({ error: 'المحفظة غير موجودة' });
    if (wallet.balance < amount) return res.status(400).json({ error: 'الرصيد غير كافٍ' });

    const id = randomUUID();
    await db.prepare('INSERT INTO payout_requests (id, provider_id, amount, iban) VALUES (?,?,?,?)')
      .run(id, req.providerId, amount, iban);

    await db.prepare('UPDATE wallets SET balance = balance - ? WHERE provider_id = ?').run(amount, req.providerId);

    const txId = randomUUID();
    await db.prepare('INSERT INTO transactions (id,wallet_id,type,amount,status,description) VALUES (?,?,?,?,?,?)')
      .run(txId, wallet.id, 'PAYOUT', amount, 'PENDING', 'طلب سحب رصيد');

    res.status(201).json({ id, amount, iban, status: 'PENDING' });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

export default router;
