import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  canManageCommunity, getCommunityConfig, writeAudit, notifyUser, addDays,
} from '../../shared/voting.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.taskId;
    const action = body?.action;
    const reason = (body?.reason || '').trim();
    const extraDays = Number(body?.extraDays) || 0;
    if (!taskId) return Response.json({ error: 'taskId requerido' }, { status: 400 });
    if (!['extend', 'new_round', 'reject'].includes(action)) {
      return Response.json({ error: 'action debe ser "extend", "new_round" o "reject"' }, { status: 400 });
    }
    if (!reason) return Response.json({ error: 'reason (motivo de la decisión) es obligatorio' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const canManage = await canManageCommunity(base44, user, task.community_id);
    if (!canManage) return Response.json({ error: 'Sin permiso: se requiere admin de plataforma o administrador de la comunidad' }, { status: 403 });

    const validStatuses = ['en_votacion_comite', 'sin_quorum', 'rechazado_comite'];
    if (!validStatuses.includes(task.status)) {
      return Response.json({ error: `Etapa incorrecta: la tarea está en "${task.status}". La decisión manual aplica a votaciones en curso, sin quórum o rechazadas por comité.` }, { status: 409 });
    }

    const config = await getCommunityConfig(base44, task.community_id);
    const now = new Date().toISOString();

    if (action === 'extend') {
      const days = extraDays > 0 ? extraDays : config.voting_deadline_days;
      const guard = await base44.asServiceRole.entities.Task.updateMany(
        { id: taskId, status: { $in: ['en_votacion_comite', 'sin_quorum'] } },
        { $set: { status: 'en_votacion_comite', voting_deadline: addDays(days), voting_closed_reason: '', voting_closed_by: '', voting_closed_at: '' } }
      );
      if (!guard.updated) return Response.json({ error: 'No se pudo extender (la tarea cambió de estado simultáneamente)' }, { status: 409 });
      await writeAudit(base44, { entity_type: 'Task', entity_id: taskId, action: 'status_change', user, details: `Plazo extendido +${days} días. Motivo: ${reason}`, community_id: task.community_id });
      return Response.json({ ok: true, action: 'extend', newDeadline: addDays(days) });
    }

    if (action === 'new_round') {
      const newRound = (task.current_voting_round || 0) + 1;
      if (newRound > config.max_voting_rounds) {
        return Response.json({ error: `Máximo de rondas alcanzado (${config.max_voting_rounds}). Usa "reject" o ajusta la configuración.` }, { status: 400 });
      }
      const guard = await base44.asServiceRole.entities.Task.updateMany(
        { id: taskId, status: { $in: ['en_votacion_comite', 'sin_quorum', 'rechazado_comite'] } },
        {
          $set: {
            status: 'pendiente_aprobacion_comite',
            current_voting_round: newRound,
            committee_votes_approve: 0, committee_votes_reject: 0,
            voting_deadline: '', voting_closed_reason: '', voting_closed_by: '', voting_closed_at: '',
            committee_rejection_reason: '',
          }
        }
      );
      if (!guard.updated) return Response.json({ error: 'No se pudo abrir nueva ronda (la tarea cambió de estado)' }, { status: 409 });
      await writeAudit(base44, { entity_type: 'Task', entity_id: taskId, action: 'status_change', user, details: `Nueva ronda ${newRound} abierta manualmente. Motivo: ${reason}`, community_id: task.community_id });
      return Response.json({ ok: true, action: 'new_round', round: newRound, message: 'Tarea devuelta a pendiente_aprobacion_comite; abre la votación nuevamente.' });
    }

    // action === 'reject'
    const guard = await base44.asServiceRole.entities.Task.updateMany(
      { id: taskId, status: { $in: ['en_votacion_comite', 'sin_quorum', 'rechazado_comite'] } },
      { $set: { status: 'rechazado_final', rejection_reason: reason, voting_closed_reason: reason, voting_closed_by: user.email, voting_closed_at: now } }
    );
    if (!guard.updated) return Response.json({ error: 'No se pudo rechazar (la tarea cambió de estado)' }, { status: 409 });
    await writeAudit(base44, { entity_type: 'Task', entity_id: taskId, action: 'status_change', user, details: `Rechazo manual definitivo. Motivo: ${reason}`, community_id: task.community_id });
    await notifyUser(base44, task.committee_sent_by || '', 'Reparación rechazada definitivamente', `La reparación "${task.title}" fue rechazada. Motivo: ${reason}`, 'general', task.community_id, `/tasks/${taskId}`);
    return Response.json({ ok: true, action: 'reject', revertedTo: 'rechazado_final' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}