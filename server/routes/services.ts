import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireProvider, AuthRequest } from '../middleware/auth.js';

const router = Router();

function formatService(s: any) {
  return {
    id: s.id, providerId: s.provider_id, name: s.name,
    description: s.description, price: s.price, duration: s.duration,
    category: s.category, image: s.image, isAvailable: !!s.is_available,
    createdAt: s.created_at,
  };
}

// GET /api/services?providerId=xxx
router.get('/', async (req, res) => {
  try {
    const { providerId } = req.query;
    let rows: any[];
    if (providerId) {
      rows = await db.prepare('SELECT * FROM services WHERE provider_id = ? ORDER BY created_at DESC').all(providerId as string);
    } else {
      rows = await db.prepare('SELECT * FROM services WHERE is_available = 1 ORDER BY created_at DESC').all();
    }
    res.json(rows.map(formatService));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/services
router.post('/', requireProvider, async (req: AuthRequest, res) => {
  try {
    const { name, description, price, duration, category, image } = req.body;
    if (!name || !price || !duration) return res.status(400).json({ error: 'بيانات ناقصة' });

    const id = randomUUID();
    await db.prepare(
      'INSERT INTO services (id,provider_id,name,description,price,duration,category,image) VALUES (?,?,?,?,?,?,?,?)'
    ).run(id, req.providerId, name, description || '', price, duration, category || '', image || '');

    const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(id) as any;
    res.status(201).json(formatService(service));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// PATCH /api/services/:id
router.patch('/:id', requireProvider, async (req: AuthRequest, res) => {
  try {
    const svc = await db.prepare('SELECT * FROM services WHERE id = ? AND provider_id = ?').get(req.params.id, req.providerId) as any;
    if (!svc) return res.status(404).json({ error: 'الخدمة غير موجودة' });

    const { name, description, price, duration, category, image, isAvailable } = req.body;
    await db.prepare(
      `UPDATE services SET
        name = COALESCE(?, name), description = COALESCE(?, description),
        price = COALESCE(?, price), duration = COALESCE(?, duration),
        category = COALESCE(?, category), image = COALESCE(?, image),
        is_available = COALESCE(?, is_available)
       WHERE id = ?`
    ).run(name ?? null, description ?? null, price ?? null, duration ?? null,
      category ?? null, image ?? null, isAvailable !== undefined ? (isAvailable ? 1 : 0) : null,
      req.params.id);

    const updated = await db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id) as any;
    res.json(formatService(updated));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// DELETE /api/services/:id
router.delete('/:id', requireProvider, async (req: AuthRequest, res) => {
  try {
    const svc = await db.prepare('SELECT * FROM services WHERE id = ? AND provider_id = ?').get(req.params.id, req.providerId) as any;
    if (!svc) return res.status(404).json({ error: 'الخدمة غير موجودة' });
    await db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

export default router;
