import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { canManageCommunity, writeAudit } from '../../shared/voting.ts';

// Actualiza la configuración de una comunidad. Requiere admin de plataforma o
// administrador de la comunidad (canManageCommunity evalúa TODAS las membresías activas).
// Permite editar tanto datos generales como la configuración de votación del comité.
const ALLOWED_KEYS = [
  'name', 'address', 'region', 'comuna', 'type', 'units', 'rut', 'contact_email',
  'description', 'year_built', 'status',
  'approval_mode', 'min_committee_votes', 'admin_can_veto', 'amount_threshold',
  'voting_deadline_days', 'allow_admin_committee_double_role', 'max_voting_rounds',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const communityId = body?.community_id;
    const data = body?.data || {};
    if (!communityId) return Response.json({ error: 'community_id requerido' }, { status: 400 });

    const list = await base44.asServiceRole.entities.Community.filter({ id: communityId });
    const community = list[0];
    if (!community) return Response.json({ error: 'Comunidad no encontrada' }, { status: 404 });

    const canManage = await canManageCommunity(base44, user, communityId);
    if (!canManage) {
      return Response.json({ error: 'Sin permiso: se requiere admin de plataforma o administrador de la comunidad' }, { status: 403 });
    }

    const patch = {};
    for (const k of ALLOWED_KEYS) if (k in data) patch[k] = data[k];

    // Validaciones mínimas de coherencia para config de votación
    if ('min_committee_votes' in patch && (Number(patch.min_committee_votes) < 1)) {
      return Response.json({ error: 'min_committee_votes debe ser ≥ 1' }, { status: 400 });
    }
    if ('voting_deadline_days' in patch && (Number(patch.voting_deadline_days) < 1)) {
      return Response.json({ error: 'voting_deadline_days debe ser ≥ 1' }, { status: 400 });
    }
    if ('max_voting_rounds' in patch && (Number(patch.max_voting_rounds) < 1)) {
      return Response.json({ error: 'max_voting_rounds debe ser ≥ 1' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Community.update(communityId, patch);

    await writeAudit(base44, {
      entity_type: 'Community', entity_id: communityId, action: 'update', user,
      details: `Configuración actualizada por ${user.email}: ${Object.keys(patch).join(', ')}`,
      community_id: communityId,
    });

    return Response.json({ ok: true, community: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}