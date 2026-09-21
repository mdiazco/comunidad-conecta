import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Devuelve la(s) comunidad(es) del usuario autenticado con su rol y la configuración
// de votación sanitizada (sin exponer datos de otros miembros ni campos internos).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const memberships = await base44.asServiceRole.entities.CommunityMember.filter({
      user_email: user.email,
      status: 'active',
    });

    const communities = [];
    for (const m of memberships) {
      const list = await base44.asServiceRole.entities.Community.filter({ id: m.community_id });
      const c = list[0];
      if (!c) continue;
      communities.push({
        id: c.id,
        name: c.name,
        type: c.type,
        role: m.role,
        approval_mode: c.approval_mode || 'majority',
        min_committee_votes: c.min_committee_votes ?? 1,
        admin_can_veto: c.admin_can_veto !== false,
        voting_deadline_days: c.voting_deadline_days ?? 7,
        max_voting_rounds: c.max_voting_rounds ?? 3,
        allow_admin_committee_double_role: c.allow_admin_committee_double_role === true,
        amount_threshold: c.amount_threshold ?? 0,
      });
    }

    return Response.json({ ok: true, communities });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}