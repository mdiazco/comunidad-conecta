// Helpers compartidos del flujo de aprobación de presupuestos.
// Importados por las backend functions de votación/aprobación.

// El shared secret para autorizar el workflow programado se almacena como secret de plataforma
// (WORKFLOW_DEADLINE_TOKEN) y se lee en checkVotingDeadlines vía `secrets.get(...)`.
// La plataforma no permite referenciar secrets desde el archivo del workflow (sus args son
// literales estáticos en el repo), por lo que el valor debe ir en `args.token` del workflow.

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

// Calcula el resultado de la votación con la regla de cierre de Fase 4b:
// - approve/reject = votos válidos (de miembros activos del comité) en la ronda actual.
// - totalMembers = miembros activos del comité.
// - minMet = se alcanzó min_committee_votes.
// - allVoted = ya votaron todos los miembros activos.
// - locked = el resultado no puede cambiar con los votos que faltan.
// - canCloseNow = minMet && (allVoted || locked) && outcome en (approved|rejected).
//   Tie y pending NUNCA se cierran solos (permanecen abiertos hasta el plazo).
export function computeResult(approve, reject, totalMembers, config) {
  const totalVotes = approve + reject;
  const minVotes = config.min_committee_votes;
  const remaining = Math.max(0, totalMembers - totalVotes);
  const allVoted = totalMembers > 0 && totalVotes >= totalMembers;
  const minMet = totalVotes >= minVotes;

  let outcome;
  if (config.approval_mode === 'unanimity') {
    if (reject > 0) outcome = 'rejected';
    else if (totalMembers > 0 && approve === totalMembers) outcome = 'approved';
    else outcome = 'pending';
  } else {
    if (approve > reject) outcome = 'approved';
    else if (reject > approve) outcome = 'rejected';
    else outcome = 'tie'; // approve === reject (incl. 0-0)
  }

  // ¿El resultado puede cambiar con los votos restantes?
  let locked = false;
  if (outcome === 'approved') {
    if (approve > reject + remaining) locked = true;
  } else if (outcome === 'rejected') {
    if (reject > approve + remaining) locked = true;
  }
  if (config.approval_mode === 'unanimity' && outcome === 'rejected') locked = true; // unanimidad rota: irrecuperable
  if (config.approval_mode === 'unanimity' && outcome === 'approved') locked = allVoted; // aprobado solo si todos votaron

  const canCloseNow = minMet && (allVoted || locked) && (outcome === 'approved' || outcome === 'rejected');

  let reason;
  if (minVotes > totalMembers && totalMembers > 0) reason = 'min_votes_exceeds_members';
  else if (!minMet) reason = 'insufficient_votes';
  else if (outcome === 'tie') reason = 'tie';
  else if (outcome === 'approved') reason = config.approval_mode === 'unanimity' ? 'unanimous' : 'majority';
  else if (outcome === 'rejected') reason = config.approval_mode === 'unanimity' ? 'unanimity_broken' : 'majority';
  else reason = 'pending';

  return { outcome, reason, totalVotes, remaining, allVoted, minMet, locked, canCloseNow };
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

// Evalúa la votación en curso de una tarea: miembros, votos válidos, config y resultado.
export async function evaluateTaskVoting(base44, task) {
  const round = task.current_voting_round || 1;
  const members = await getCommitteeMembers(base44, task.community_id);
  const committeeEmails = members.map(m => m.user_email);
  const roundVotes = await base44.asServiceRole.entities.CommitteeVote.filter({ task_id: task.id, round });
  const { approve, reject } = countValidVotes(roundVotes, committeeEmails);
  const config = await getCommunityConfig(base44, task.community_id);
  const result = computeResult(approve, reject, members.length, config);
  return { round, members, committeeEmails, approve, reject, config, result };
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