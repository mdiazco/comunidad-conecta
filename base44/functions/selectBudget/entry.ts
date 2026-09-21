import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { canManageCommunity, writeAudit } from '../../shared/voting.ts';

// Selecciona un presupuesto (marca is_selected; deselecciona los demás).
// Solo en etapas en_evaluacion o pendiente_aprobacion_comite.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.task_id;
    const budgetId = body?.budget_id;
    if (!taskId || !budgetId) return Response.json({ error: 'task_id y budget_id requeridos' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    if (!await canManageCommunity(base44, user, task.community_id)) {
      return Response.json({ error: 'Sin permiso: se requiere administrador de la comunidad' }, { status: 403 });
    }
    if (!['en_evaluacion', 'pendiente_aprobacion_comite'].includes(task.status)) {
      return Response.json({ error: `Etapa incorrecta: la tarea está en "${task.status}"` }, { status: 409 });
    }

    const bList = await base44.asServiceRole.entities.Budget.filter({ id: budgetId, task_id: taskId });
    if (!bList[0]) return Response.json({ error: 'Presupuesto no encontrado para esta tarea' }, { status: 404 });

    await base44.asServiceRole.entities.Budget.updateMany(
      { task_id: taskId, is_selected: true },
      { $set: { is_selected: false } }
    );
    await base44.asServiceRole.entities.Budget.update(budgetId, { is_selected: true });

    await writeAudit(base44, {
      entity_type: 'Budget', entity_id: budgetId, action: 'update', user,
      details: `Presupuesto seleccionado para tarea "${task.title}"`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}