import { Request, Response, NextFunction } from 'express';
import db from '../db.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  providerId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  (async () => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    const token = header.slice(7);
    const session = await db.prepare(
      `SELECT s.user_id, u.role, p.id as provider_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN providers p ON p.user_id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    ).get(token) as any;

    if (!session) {
      return res.status(401).json({ error: 'الجلسة منتهية، يرجى تسجيل الدخول مجدداً' });
    }

    req.userId = session.user_id;
    req.userRole = session.role;
    req.providerId = session.provider_id || undefined;
    next();
  })().catch(next);
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, (err?: any) => {
    if (err) return next(err);
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'للمسؤولين فقط' });
    }
    next();
  });
}

export function requireProvider(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, (err?: any) => {
    if (err) return next(err);
    if (req.userRole !== 'PROVIDER') {
      return res.status(403).json({ error: 'للمزودين فقط' });
    }
    next();
  });
}
