import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/conversations
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    let rows: any[];
    if (req.userRole === 'CLIENT') {
      rows = await db.prepare(
        `SELECT c.*,
          u_p.name as provider_name, u_p.avatar as provider_avatar,
          u_c.name as client_name,
          (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_role = 'PROVIDER') as unread_count
         FROM conversations c
         JOIN providers p ON p.id = c.provider_id
         JOIN users u_p ON u_p.id = p.user_id
         JOIN users u_c ON u_c.id = c.client_id
         WHERE c.client_id = ? ORDER BY last_message_at DESC`
      ).all(req.userId);
    } else if (req.userRole === 'PROVIDER') {
      rows = await db.prepare(
        `SELECT c.*,
          u_p.name as provider_name, u_p.avatar as provider_avatar,
          u_c.name as client_name,
          (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_role = 'CLIENT') as unread_count
         FROM conversations c
         JOIN providers p ON p.id = c.provider_id
         JOIN users u_p ON u_p.id = p.user_id
         JOIN users u_c ON u_c.id = c.client_id
         WHERE c.provider_id = ? ORDER BY last_message_at DESC`
      ).all(req.providerId);
    } else {
      rows = [];
    }

    res.json(rows.map(c => ({
      id: c.id,
      clientId: c.client_id,
      clientName: c.client_name,
      providerId: c.provider_id,
      providerName: c.provider_name,
      providerAvatar: c.provider_avatar,
      lastMessage: c.last_message || '',
      lastMessageAt: c.last_message_at || c.created_at,
      unreadCount: c.unread_count || 0,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/conversations — start or get existing
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'CLIENT') return res.status(403).json({ error: 'للعملاء فقط' });

    const { providerId } = req.body;
    if (!providerId) return res.status(400).json({ error: 'providerId مطلوب' });

    let conv = await db.prepare('SELECT * FROM conversations WHERE client_id = ? AND provider_id = ?').get(req.userId, providerId) as any;
    if (!conv) {
      const id = randomUUID();
      await db.prepare('INSERT INTO conversations (id, client_id, provider_id) VALUES (?,?,?)').run(id, req.userId, providerId);
      conv = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    }

    const row = await db.prepare(
      `SELECT c.*,
        u_p.name as provider_name, u_p.avatar as provider_avatar,
        u_c.name as client_name
       FROM conversations c
       JOIN providers p ON p.id = c.provider_id
       JOIN users u_p ON u_p.id = p.user_id
       JOIN users u_c ON u_c.id = c.client_id
       WHERE c.id = ?`
    ).get(conv.id) as any;

    res.json({
      id: row.id, clientId: row.client_id, clientName: row.client_name,
      providerId: row.provider_id, providerName: row.provider_name,
      providerAvatar: row.provider_avatar, lastMessage: '', lastMessageAt: row.created_at, unreadCount: 0,
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const conv = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id) as any;
    if (!conv) return res.status(404).json({ error: 'المحادثة غير موجودة' });

    if (req.userRole === 'CLIENT') {
      await db.prepare(`UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = 'PROVIDER'`).run(req.params.id);
    } else if (req.userRole === 'PROVIDER') {
      await db.prepare(`UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = 'CLIENT'`).run(req.params.id);
    }

    const rows = await db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id) as any[];
    res.json(rows.map(m => ({
      id: m.id, conversationId: m.conversation_id, senderId: m.sender_id,
      senderRole: m.sender_role, content: m.content, isRead: !!m.is_read, createdAt: m.created_at,
    })));
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'المحتوى مطلوب' });

    const conv = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id) as any;
    if (!conv) return res.status(404).json({ error: 'المحادثة غير موجودة' });

    const senderRole = req.userRole === 'CLIENT' ? 'CLIENT' : 'PROVIDER';
    const id = randomUUID();
    await db.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, sender_role, content) VALUES (?,?,?,?,?)'
    ).run(id, req.params.id, req.userId, senderRole, content.trim());

    const msg = await db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
    res.status(201).json({
      id: msg.id, conversationId: msg.conversation_id, senderId: msg.sender_id,
      senderRole: msg.sender_role, content: msg.content, isRead: false, createdAt: msg.created_at,
    });
  } catch { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

export default router;
