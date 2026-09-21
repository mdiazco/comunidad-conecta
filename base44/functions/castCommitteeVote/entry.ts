import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  getCommitteeMembers, getCommunityConfig,
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

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const committee = await getCommitteeMembers(base44, task.community_id);
    const isCommittee = committee.some(m => (m.user_email || '').toLowerCase() === (user.email || '').toLowerCase());
    if (!isCommittee) {
      return Response.json({ error: 'No eres miembro activo del comité de esta comunidad' }, { status: 403 });
    }

    if (task.status !== 'en_votacion_comite') {
      return Response.json({ error: `La tarea no está en votación (estado actual: "${task.status}")` }, { status: 409 });
    }

    const round = task.current_voting_round || 1;

    // Unicidad: no puede votar dos veces en la misma ronda (chequeo secuencial).
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

    // Defensa contra concurrencia del MISMO usuario en la misma ronda: si bajo carrera
    // se crearon múltiples votos, conservar solo el más antiguo y eliminar los duplicados.
    const mine = await base44.asServiceRole.entities.CommitteeVote.filter({
      task_id: taskId, voter_email: user.email, round,
    });
    if (mine.length > 1) {
      mine.sort((a, b) => (a.created_date || '').localeCompare(b.created_date || '') || (a.id || '').localeCompare(b.id || ''));
      const dupIds = mine.slice(1).map(v => v.id);
      await base44.asServiceRole.entities.CommitteeVote.deleteMany({ id: { $in: dupIds } });
    }

    // Recomputar con votos válidos (solo de miembros activos del comité) tras la limpieza.
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
    // Cierre automático solo si canCloseNow (minMet && (allVoted||locked) && approved|rejected).
    if (result.canCloseNow && result.outcome === 'approved') {
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
    } else if (result.canCloseNow && result.outcome === 'rejected') {
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
    // tie / pending / no lockable → permanece en en_votacion_comite

    const _au = await writeAudit(base44, {
      entity_type: 'CommitteeVote', entity_id: taskId, action: 'create', user,
      details: `Voto ${vote} en ronda ${round}${comment ? ` — "${comment}"` : ''}${transitionedTo ? ` → ${transitionedTo}` : ''}`,
      community_id: task.community_id,
    });

    return Response.json({
      ok: true, vote, round, approve, reject, result: result.outcome, reason: result.reason,
      transitionedTo, auditWarning: _au.ok ? undefined : _au.error,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}