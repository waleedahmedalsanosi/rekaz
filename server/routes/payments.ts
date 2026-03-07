/**
 * server/routes/payments.ts — Moyasar payment gateway integration.
 *
 * Endpoints:
 *  POST /api/payments/create   — Create a Moyasar payment for a booking
 *  GET  /api/payments/callback — 3DS redirect landing (Moyasar → server → SPA)
 *  POST /api/payments/webhook  — Moyasar webhook events (payment_paid, etc.)
 *
 * Sandbox:
 *  Register at https://dashboard.moyasar.com → copy sk_test_... and pk_test_...
 *  Test card: 4111111111111111  exp 05/30  CVV 123
 *  STC Pay test mobile: 0512345678 (sandbox)
 *
 * Security note:
 *  ALWAYS verify payment server-side via GET /v1/payments/{id} before marking
 *  a booking as paid. Never trust the callback query param ?status=paid alone.
 */
import { Router } from 'express';
import { createHmac } from 'crypto';
import db from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const MOYASAR_API = 'https://api.moyasar.com/v1';
const SECRET_KEY  = () => process.env.MOYASAR_SECRET_KEY || '';

/** Base64-encoded "sk_test_xxx:" for HTTP Basic Auth */
function moyasarAuth() {
  return `Basic ${Buffer.from(`${SECRET_KEY()}:`).toString('base64')}`;
}

/** Fetch a payment from Moyasar and return it (server-side verification). */
async function fetchPayment(paymentId: string) {
  const res = await fetch(`${MOYASAR_API}/payments/${paymentId}`, {
    headers: { Authorization: moyasarAuth() },
  });
  return res.json() as any;
}

// ─── POST /api/payments/create ───────────────────────────────────────────────
// Creates a Moyasar payment for a booking. Supports credit card and STC Pay.
// Returns { redirect_url } when 3DS is required, or { success: true } if paid
// immediately (rare in sandbox; most cards trigger 3DS).
router.post('/create', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!SECRET_KEY()) {
      return res.status(503).json({ error: 'بوابة الدفع غير مهيأة — اتصل بالدعم' });
    }

    const { bookingId, source } = req.body as {
      bookingId: string;
      source: {
        type: 'creditcard' | 'stcpay';
        // credit card fields
        name?: string; number?: string; month?: string; year?: string; cvc?: string;
        // stcpay field
        mobile?: string;
      };
    };

    if (!bookingId || !source?.type) {
      return res.status(400).json({ error: 'بيانات الدفع ناقصة' });
    }

    // Fetch the booking to get the amount and verify ownership
    const booking = await db.prepare(
      'SELECT * FROM bookings WHERE id = ? AND customer_id = ?'
    ).get(bookingId, req.userId) as any;

    if (!booking) return res.status(404).json({ error: 'الحجز غير موجود' });
    if (booking.payment_status === 'PAID') {
      return res.status(400).json({ error: 'تم الدفع مسبقاً' });
    }

    // Amount in halalas (smallest SAR unit). 1 SAR = 100 halalas.
    const amountHalalas = Math.round(booking.total_price * 100);

    // Build callback URL — works in dev (localhost) and production
    const host = req.headers.host || 'localhost:3001';
    const protocol = req.secure || host.includes('vercel') || host.includes('render') ? 'https' : 'http';
    const callbackUrl = `${protocol}://${host}/api/payments/callback`;

    const paymentBody: Record<string, unknown> = {
      amount: amountHalalas,
      currency: 'SAR',
      description: `حجز زينة #${bookingId.slice(0, 8)}`,
      callback_url: callbackUrl,
      metadata: {
        booking_id: bookingId,
        customer_id: req.userId,
      },
      source,
    };

    const moyasarRes = await fetch(`${MOYASAR_API}/payments`, {
      method: 'POST',
      headers: {
        Authorization: moyasarAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentBody),
    });

    const payment = await moyasarRes.json() as any;

    if (!moyasarRes.ok) {
      console.error('[Moyasar] payment create error:', payment);
      return res.status(400).json({ error: payment.message || 'فشل إنشاء الدفعة' });
    }

    // Store the Moyasar payment ID against the booking for later verification
    await db.prepare('UPDATE bookings SET moyasar_payment_id = ? WHERE id = ?')
      .run(payment.id, bookingId);

    // If 3DS is needed, return the redirect URL
    if (payment.source?.transaction_url) {
      return res.json({ redirect_url: payment.source.transaction_url, payment_id: payment.id });
    }

    // Paid immediately (edge case — no 3DS)
    if (payment.status === 'paid') {
      await markBookingPaid(bookingId, booking);
      return res.json({ success: true, payment_id: payment.id });
    }

    // Initiated but no 3DS URL — shouldn't happen; return what we have
    return res.json({ payment_id: payment.id, status: payment.status });
  } catch (e: any) {
    console.error('[Moyasar] create error:', e);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── GET /api/payments/callback ──────────────────────────────────────────────
// Moyasar redirects here after 3DS authentication.
// ?id=pay_xxx&status=paid  (NEVER trust the status param alone — verify server-side)
router.get('/callback', async (req, res) => {
  const { id: paymentId } = req.query as { id?: string; status?: string };

  if (!paymentId) {
    return res.redirect('/?payment_error=missing_id');
  }

  try {
    // Server-side verification — fetch the real payment status from Moyasar
    const payment = await fetchPayment(paymentId);

    if (payment.status === 'paid') {
      const bookingId = payment.metadata?.booking_id;
      if (bookingId) {
        const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
        if (booking && booking.payment_status !== 'PAID') {
          await markBookingPaid(bookingId, booking);
        }
      }
      return res.redirect(`/?payment_success=${bookingId || ''}`);
    } else {
      const reason = encodeURIComponent(payment.source?.message || 'الدفع لم يتم');
      return res.redirect(`/?payment_failed=${reason}`);
    }
  } catch (e: any) {
    console.error('[Moyasar] callback verify error:', e);
    return res.redirect('/?payment_error=verify_failed');
  }
});

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
// Moyasar sends signed webhook events for reliable confirmation.
// Configure webhook URL in Moyasar dashboard: /api/payments/webhook
router.post('/webhook', express_rawBody(), async (req, res) => {
  const signature = req.headers['x-moyasar-signature'] as string | undefined;
  const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const expected = createHmac('sha256', webhookSecret)
      .update((req as any).rawBody)
      .digest('hex');
    if (signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  let event: any;
  try { event = JSON.parse((req as any).rawBody || '{}'); } catch { return res.status(400).end(); }

  if (event.type === 'payment_paid') {
    const { id: paymentId, metadata } = event.data || {};
    const bookingId = metadata?.booking_id;
    if (bookingId) {
      try {
        const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
        if (booking && booking.payment_status !== 'PAID') {
          await markBookingPaid(bookingId, booking);
          console.log(`[Moyasar] Webhook: booking ${bookingId} marked PAID via payment ${paymentId}`);
        }
      } catch (e) { console.error('[Moyasar] webhook DB error:', e); }
    }
  }

  res.status(200).json({ received: true });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function markBookingPaid(bookingId: string, booking: any) {
  const { randomUUID } = await import('crypto');

  await db.prepare("UPDATE bookings SET payment_status = 'PAID' WHERE id = ?").run(bookingId);

  const wallet = await db.prepare('SELECT * FROM wallets WHERE provider_id = ?').get(booking.provider_id) as any;
  if (wallet) {
    await db.prepare(
      'UPDATE wallets SET pending_balance = pending_balance + ?, total_earned = total_earned + ? WHERE provider_id = ?'
    ).run(booking.service_price, booking.service_price, booking.provider_id);

    await db.prepare(
      'INSERT INTO transactions (id,wallet_id,booking_id,type,amount,description) VALUES (?,?,?,?,?,?)'
    ).run(
      randomUUID(), wallet.id, bookingId, 'CREDIT',
      booking.service_price,
      `حجز #${bookingId.slice(0, 8)} - دفعة موياسر`
    );
  }
}

/** Middleware to capture raw body for webhook HMAC verification. */
function express_rawBody() {
  return (req: any, _res: any, next: any) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => { req.rawBody = body; next(); });
  };
}

export default router;
