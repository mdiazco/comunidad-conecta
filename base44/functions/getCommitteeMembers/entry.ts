import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, getMembership } from '../../shared/voting.ts';

// Miembros activos del comité de una comunidad (conteo + nombres), sanitizado.
// Requiere membresía activa en la comunidad (cualquier rol) o admin de plataforma.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const communityId = body?.community_id;
    if (!communityId) return Response.json({ error: 'community_id requerido' }, { status: 400 });

    if (!isPlatformAdmin(user)) {
      const m = await getMembership(base44, user.email, communityId);
      if (!m) return Response.json({ error: 'No eres miembro activo de esta comunidad' }, { status: 403 });
    }

    const members = await base44.asServiceRole.entities.CommunityMember.filter({
      community_id: communityId, status: 'active', role: 'comite',
    });

    return Response.json({
      ok: true,
      count: members.length,
      members: members.map(m => ({ name: m.user_name || m.user_email, email: m.user_email })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}