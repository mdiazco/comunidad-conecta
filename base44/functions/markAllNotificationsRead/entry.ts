import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin } from '../../shared/voting.ts';

// Marca TODAS las notificaciones no leídas del usuario como leídas.
// Solo actúa sobre notificaciones del propio usuario (o admin de plataforma).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const filter = isPlatformAdmin(user) && (await req.json().catch(() => ({})))?.all === true
      ? { read: false }
      : { user_email: user.email, read: false };

    const res = await base44.asServiceRole.entities.Notification.updateMany(filter, { $set: { read: true } });
    return Response.json({ ok: true, updated: res.updated ?? res.matched ?? 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}