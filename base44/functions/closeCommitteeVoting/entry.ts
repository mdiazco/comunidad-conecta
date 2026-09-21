import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  canManageCommunity, getCommunityConfig, getCommitteeMembers,
  computeResult, countValidVotes, writeAudit, notifyUser,
} from '../../shared/voting.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.taskId;
    if (!taskId) return Response.json({ error: 'taskId requerido' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const canManage = await canManageCommunity(base44, user, task.community_id);
    if (!canManage) return Response.json({ error: 'Sin permiso: se requiere admin de plataforma o administrador de la comunidad' }, { status: 403 });

    if (task.status !== 'en_votacion_comite') {
      return Response.json({ error: `La tarea no está en votación (estado actual: "${task.status}")` }, { status: 409 });
    }

    const round = task.current_voting_round || 1;
    const members = await getCommitteeMembers(base44, task.community_id);
    const committeeEmails = members.map(m => m.user_email);
    const roundVotes = await base44.asServiceRole.entities.CommitteeVote.filter({ task_id: taskId, round });
    const { approve, reject } = countValidVotes(roundVotes, committeeEmails);

    const config = await getCommunityConfig(base44, task.community_id);
    const result = computeResult(approve, reject, members.length, config);
    const now = new Date().toISOString();

    let transitionedTo = null;
    let message = '';

    if (result.outcome === 'approved') {
      const g = await base44.asServiceRole.entities.Task.updateMany(
        { id: taskId, status: 'en_votacion_comite' },
        { $set: { status: 'pendiente_aprobacion_admin', committee_votes_approve: approve, committee_votes_reject: reject, committee_approved_at: now } }
      );
      if (g.updated) {
        transitionedTo = 'pendiente_aprobacion_admin';
        await notifyUser(base44, task.committee_sent_by || '', 'Votación aprobada — pendiente tu aprobación final',
          `El comité aprobó el presupuesto de "${task.title}".`, 'general', task.community_id, `/tasks/${taskId}`);
      } else {
        return Response.json({ ok: true, idempotent: true, message: 'La votación ya fue cerrada' });
      }
    } else if (result.outcome === 'rejected') {
      const g = await base44.asServiceRole.entities.Task.updateMany(
        { id: taskId, status: 'en_votacion_comite' },
        { $set: { status: 'rechazado_comite', committee_votes_approve: approve, committee_votes_reject: reject, committee_rejection_reason: 'Rechazado por el comité' } }
      );
      if (g.updated) {
        transitionedTo = 'rechazado_comite';
      } else {
        return Response.json({ ok: true, idempotent: true, message: 'La votación ya fue cerrada' });
      }
    } else {
      // tie o pending (sin quórum): no se transiciona automáticamente
      await base44.asServiceRole.entities.Task.updateMany(
        { id: taskId },
        { $set: { committee_votes_approve: approve, committee_votes_reject: reject } }
      );
      message = result.outcome === 'tie'
        ? 'Empate: la votación no aprueba. Permanece abierta hasta el plazo; luego usa la decisión manual.'
        : 'Sin quórum suficiente: la votación permanece abierta. Usa la decisión manual o espera al plazo.';
    }

    await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'status_change', user,
      details: `Cierre de votación ronda ${round}: ${approve} approve / ${reject} reject → ${transitionedTo || result.outcome}`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true, approve, reject, result: result.outcome, transitionedTo, message });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}