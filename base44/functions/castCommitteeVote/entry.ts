import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  getMembership, getCommunityConfig, getCommitteeMembers,
  computeResult, countValidVotes, writeAudit, notifyUser,
} from '../../shared/voting.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.taskId;
    const vote = body?.vote;
    const comment = (body?.comment || '').trim();
    if (!taskId) return Response.json({ error: 'taskId requerido' }, { status: 400 });
    if (!['approve', 'reject'].includes(vote)) return Response.json({ error: 'vote debe ser "approve" o "reject"' }, { status: 400 });

    // El votante SIEMPRE es el usuario autenticado; se ignora cualquier voter_email del cliente.
    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const membership = await getMembership(base44, user.email, task.community_id);
    if (!membership || membership.role !== 'comite') {
      return Response.json({ error: 'No eres miembro activo del comité de esta comunidad' }, { status: 403 });
    }

    if (task.status !== 'en_votacion_comite') {
      return Response.json({ error: `La tarea no está en votación (estado actual: "${task.status}")` }, { status: 409 });
    }

    const round = task.current_voting_round || 1;

    // Unicidad: no puede votar dos veces en la misma ronda
    const existing = await base44.asServiceRole.entities.CommitteeVote.filter({
      task_id: taskId, voter_email: user.email, round,
    });
    if (existing.length > 0) {
      return Response.json({ error: 'Ya emitiste tu voto en esta ronda' }, { status: 409 });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.CommitteeVote.create({
      task_id: taskId,
      community_id: task.community_id,
      voter_email: user.email,
      voter_name: user.full_name || user.email,
      vote,
      comment: comment || undefined,
      budget_id: task.committee_suggested_budget_id || undefined,
      voted_at: now,
      round,
    });

    // Recomputar contadores con votos válidos (solo de miembros activos del comité)
    const members = await getCommitteeMembers(base44, task.community_id);
    const committeeEmails = members.map(m => m.user_email);
    const roundVotes = await base44.asServiceRole.entities.CommitteeVote.filter({ task_id: taskId, round });
    const { approve, reject } = countValidVotes(roundVotes, committeeEmails);

    await base44.asServiceRole.entities.Task.updateMany(
      { id: taskId },
      { $set: { committee_votes_approve: approve, committee_votes_reject: reject } }
    );

    const config = await getCommunityConfig(base44, task.community_id);
    const result = computeResult(approve, reject, members.length, config);

    let transitionedTo = null;
    if (result.outcome === 'approved') {
      const g = await base44.asServiceRole.entities.Task.updateMany(
        { id: taskId, status: 'en_votacion_comite' },
        { $set: { status: 'pendiente_aprobacion_admin', committee_approved_at: now } }
      );
      if (g.updated) {
        transitionedTo = 'pendiente_aprobacion_admin';
        await notifyUser(base44, task.committee_sent_by || '',
          'Votación aprobada — pendiente tu aprobación final',
          `El comité aprobó el presupuesto de "${task.title}". Revisa y confirma o veta.`,
          'general', task.community_id, `/tasks/${taskId}`);
      }
    } else if (result.outcome === 'rejected') {
      const g = await base44.asServiceRole.entities.Task.updateMany(
        { id: taskId, status: 'en_votacion_comite' },
        { $set: { status: 'rechazado_comite', committee_rejection_reason: comment || 'Rechazado por el comité' } }
      );
      if (g.updated) {
        transitionedTo = 'rechazado_comite';
        await notifyUser(base44, task.committee_sent_by || '',
          'Votación rechazada por el comité',
          `El comité rechazó el presupuesto de "${task.title}".`,
          'general', task.community_id, `/tasks/${taskId}`);
      }
    }
    // outcome 'tie' o 'pending' → permanece en en_votacion_comite

    const _au = await writeAudit(base44, {
      entity_type: 'CommitteeVote', entity_id: taskId, action: 'create', user,
      details: `Voto ${vote} en ronda ${round}${comment ? ` — "${comment}"` : ''}${transitionedTo ? ` → ${transitionedTo}` : ''}`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true, vote, round, approve, reject, result: result.outcome, transitionedTo, auditWarning: _au.ok ? undefined : _au.error });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}