import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, getMembership } from '../../shared/voting.ts';

// Tareas visibles para el usuario según su rol en la comunidad:
// - admin de plataforma: todas.
// - administrador de comunidad: todas las tareas de su(s) comunidad(es).
// - equipo / operativo: tareas de su(s) comunidad(es) asignadas a él (assigned_to o created_by).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    if (isPlatformAdmin(user)) {
      const tasks = await base44.asServiceRole.entities.Task.list('-updated_date', 200);
      return Response.json({ ok: true, tasks });
    }

    const memberships = await base44.asServiceRole.entities.CommunityMember.filter({
      user_email: user.email, status: 'active',
    });
    if (memberships.length === 0) return Response.json({ ok: true, tasks: [] });

    const commIds = memberships.map(m => m.community_id);
    const isAdminOf = new Set(memberships.filter(m => m.role === 'administrador').map(m => m.community_id));

    const all = await base44.asServiceRole.entities.Task.list('-updated_date', 200);
    const mine = all.filter(t => {
      if (!commIds.includes(t.community_id)) return false;
      if (isAdminOf.has(t.community_id)) return true; // administrador ve todo de su comunidad
      // equipo/operativo: solo las asignadas a él o creadas por él
      return (t.assigned_to || '').toLowerCase() === (user.email || '').toLowerCase()
        || (t.created_by || '').toLowerCase() === (user.email || '').toLowerCase();
    });

    return Response.json({ ok: true, tasks: mine });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}