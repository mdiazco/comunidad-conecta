// Helpers compartidos del flujo de aprobación de presupuestos.
// Importados por las backend functions de votación/aprobación.

export function isPlatformAdmin(user) {
  return user?.role === 'admin';
}

export async function getMembership(base44, userEmail, communityId) {
  const list = await base44.asServiceRole.entities.CommunityMember.filter({
    community_id: communityId,
    user_email: userEmail,
    status: 'active',
  });
  return list[0] || null;
}

// ¿Puede el usuario gestionar la comunidad (abrir/cerrar/aprobar/vetar)?
export async function canManageCommunity(base44, user, communityId) {
  if (isPlatformAdmin(user)) return true;
  const m = await getMembership(base44, user.email, communityId);
  return m?.role === 'administrador';
}

export async function getCommunityConfig(base44, communityId) {
  const list = await base44.asServiceRole.entities.Community.filter({ id: communityId });
  const c = list[0] || {};
  return {
    approval_mode: c.approval_mode || 'majority',
    min_committee_votes: c.min_committee_votes ?? 1,
    admin_can_veto: c.admin_can_veto !== false,
    voting_deadline_days: c.voting_deadline_days ?? 7,
    max_voting_rounds: c.max_voting_rounds ?? 3,
    allow_admin_committee_double_role: c.allow_admin_committee_double_role === true,
    amount_threshold: c.amount_threshold ?? 0,
  };
}

export async function getCommitteeMembers(base44, communityId) {
  return base44.asServiceRole.entities.CommunityMember.filter({
    community_id: communityId,
    status: 'active',
    role: 'comite',
  });
}

// Calcula el resultado de la votación.
// approve/reject = votos válidos (de miembros activos del comité) en la ronda actual.
// totalMembers = número de miembros activos del comité.
export function computeResult(approve, reject, totalMembers, config) {
  const totalVotes = approve + reject;
  const minVotes = config.min_committee_votes;
  if (minVotes > totalMembers && totalVotes === totalMembers) {
    // min_committee_votes imposible de satisfacer
    return { outcome: 'pending', reason: 'min_votes_exceeds_members' };
  }
  if (totalVotes < minVotes) return { outcome: 'pending', reason: 'insufficient_votes' };
  if (config.approval_mode === 'unanimity') {
    if (reject > 0) return { outcome: 'rejected', reason: 'unanimity_broken' };
    if (approve === totalMembers) return { outcome: 'approved', reason: 'unanimous' };
    return { outcome: 'pending', reason: 'unanimity_incomplete' };
  }
  // mayoría simple
  if (approve > reject) return { outcome: 'approved', reason: 'majority' };
  if (reject > approve) return { outcome: 'rejected', reason: 'majority' };
  return { outcome: 'tie', reason: 'tie' };
}

// Cuenta solo los votos de la ronda actual emitidos por miembros activos del comité.
export function countValidVotes(roundVotes, committeeEmails) {
  const validSet = new Set(committeeEmails.map(e => (e || '').toLowerCase()));
  let approve = 0, reject = 0;
  for (const v of roundVotes) {
    if (!validSet.has((v.voter_email || '').toLowerCase())) continue;
    if (v.vote === 'approve') approve++;
    else if (v.vote === 'reject') reject++;
  }
  return { approve, reject };
}

export async function writeAudit(base44, { entity_type, entity_id, action, user, details, community_id }) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type,
      entity_id,
      action,
      user_email: user?.email || 'system',
      user_name: user?.full_name || user?.email || 'system',
      details,
      community_id,
    });
    return { ok: true };
  } catch (e) {
    console.error(`[AUDIT FAIL] ${entity_type}/${entity_id} ${action}:`, e?.message || String(e));
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function notifyUser(base44, email, title, message, type, communityId, link) {
  try {
    await base44.asServiceRole.entities.Notification.create({
      user_email: email,
      title,
      message,
      type,
      community_id: communityId,
      link,
      read: false,
    });
  } catch (_e) {
    // notificación no bloquea
  }
}

export function addDays(days) {
  return new Date(Date.now() + (days || 7) * 86400000).toISOString();
}