import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin } from '../../shared/voting.ts';

// Devuelve las comunidades visibles para el usuario autenticado:
// - admin de plataforma: TODAS las comunidades (datos completos) + rol de membresía si existe.
// - no admin: solo las comunidades donde tiene membresía activa (datos completos + rol).
// Reemplaza la lectura directa de Community.list/filter (RLS read ahora es admin-only),
// de modo que un usuario no admin no vea comunidades ajenas ni sus campos sensibles.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    if (isPlatformAdmin(user)) {
      const all = await base44.asServiceRole.entities.Community.list('-created_date', 500);
      const myMbs = await base44.asServiceRole.entities.CommunityMember.filter({ user_email: user.email, status: 'active' });
      const roleByComm = {};
      for (const m of myMbs) roleByComm[m.community_id] = m.role;
      const communities = all.map(c => ({ ...c, role: roleByComm[c.id] || null }));
      return Response.json({ ok: true, communities });
    }

    const memberships = await base44.asServiceRole.entities.CommunityMember.filter({ user_email: user.email, status: 'active' });
    const communities = [];
    for (const m of memberships) {
      const list = await base44.asServiceRole.entities.Community.filter({ id: m.community_id });
      const c = list[0];
      if (!c) continue;
      communities.push({ ...c, role: m.role });
    }
    return Response.json({ ok: true, communities });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}