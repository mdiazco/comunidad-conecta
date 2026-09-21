import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin } from '../../shared/voting.ts';

// Marca una notificación como leída validando titularidad: solo el dueño o un admin.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const id = body?.id;
    if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });

    const list = await base44.asServiceRole.entities.Notification.filter({ id });
    const notif = list[0];
    if (!notif) return Response.json({ error: 'Notificación no encontrada' }, { status: 404 });

    if (notif.user_email !== user.email && !isPlatformAdmin(user)) {
      return Response.json({ error: 'Sin permiso: no es tu notificación' }, { status: 403 });
    }

    if (notif.read) return Response.json({ ok: true, alreadyRead: true });

    await base44.asServiceRole.entities.Notification.update(id, { read: true });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}