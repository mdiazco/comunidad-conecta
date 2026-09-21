import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  canManageCommunity, getCommunityConfig, getCommitteeMembers,
  writeAudit, notifyUser, addDays,
} from '../../shared/voting.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.taskId;
    const suggestedBudgetId = body?.suggestedBudgetId || null;
    if (!taskId) return Response.json({ error: 'taskId requerido' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const canManage = await canManageCommunity(base44, user, task.community_id);
    if (!canManage) return Response.json({ error: 'Sin permiso: se requiere admin de plataforma o administrador de la comunidad' }, { status: 403 });

    if (task.status !== 'pendiente_aprobacion_comite') {
      return Response.json({ error: `Etapa incorrecta: la tarea está en "${task.status}", no en "pendiente_aprobacion_comite"` }, { status: 409 });
    }

    const config = await getCommunityConfig(base44, task.community_id);
    const budgets = await base44.asServiceRole.entities.Budget.filter({ task_id: taskId });
    if (budgets.length < 3 && !task.budget_exception_reason) {
      return Response.json({ error: `Se requieren mínimo 3 presupuestos (o autorizar una excepción con motivo). Actualmente: ${budgets.length}` }, { status: 400 });
    }

    const newRound = (task.current_voting_round || 0) + 1;
    if (newRound > config.max_voting_rounds) {
      return Response.json({ error: `Máximo de rondas de votación alcanzado (${config.max_voting_rounds}). Usa la decisión manual.` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const deadline = addDays(config.voting_deadline_days);

    // Guarda atómica: solo avanza si sigue en pendiente_aprobacion_comite
    const guard = await base44.asServiceRole.entities.Task.updateMany(
      { id: taskId, status: 'pendiente_aprobacion_comite' },
      {
        $set: {
          status: 'en_votacion_comite',
          current_voting_round: newRound,
          voting_deadline: deadline,
          voting_closed_reason: '',
          voting_closed_by: '',
          voting_closed_at: '',
          committee_sent_at: now,
          committee_sent_by: user.email,
          committee_votes_approve: 0,
          committee_votes_reject: 0,
          committee_suggested_budget_id: suggestedBudgetId || task.committee_suggested_budget_id || '',
        },
      }
    );
    if (!guard.updated) {
      return Response.json({ error: 'La tarea ya no estaba pendiente de envío (modificada simultáneamente)' }, { status: 409 });
    }

    // Marcar presupuesto sugerido como seleccionado
    if (suggestedBudgetId) {
      await base44.asServiceRole.entities.Budget.updateMany(
        { task_id: taskId, is_selected: true },
        { $set: { is_selected: false } }
      );
      await base44.asServiceRole.entities.Budget.update(suggestedBudgetId, { is_selected: true });
    }

    // Notificar a miembros del comité
    const members = await getCommitteeMembers(base44, task.community_id);
    await Promise.all(members.map(m =>
      notifyUser(base44, m.user_email, 'Nueva votación pendiente',
        `Se requiere tu voto para la tarea "${task.title}" (ronda ${newRound}). Plazo: ${deadline}.`,
        'task_assigned', task.community_id, `/tasks/${taskId}`)
    ));

    const _au = await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'status_change', user,
      details: `pendiente_aprobacion_comite → en_votacion_comite (ronda ${newRound}, plazo ${deadline})`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true, round: newRound, deadline, notified: members.length, auditWarning: _au.ok ? undefined : _au.error });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}