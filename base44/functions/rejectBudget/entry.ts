import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { canManageCommunity, writeAudit } from '../../shared/voting.ts';

// Rechaza (devuelve a en_evaluacion con motivo). Solo en en_evaluacion o pendiente_aprobacion_comite.
// Deselecciona y desaprueba los presupuestos seleccionados.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.task_id;
    const reason = (body?.reason || '').trim();
    if (!taskId) return Response.json({ error: 'task_id requerido' }, { status: 400 });
    if (!reason) return Response.json({ error: 'reason requerido' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    if (!await canManageCommunity(base44, user, task.community_id)) {
      return Response.json({ error: 'Sin permiso: se requiere administrador de la comunidad' }, { status: 403 });
    }
    if (!['en_evaluacion', 'pendiente_aprobacion_comite'].includes(task.status)) {
      return Response.json({ error: `Etapa incorrecta: la tarea está en "${task.status}"` }, { status: 409 });
    }

    const budgets = await base44.asServiceRole.entities.Budget.filter({ task_id: taskId });
    await Promise.all(
      budgets.filter(b => b.is_selected || b.is_approved).map(b =>
        base44.asServiceRole.entities.Budget.update(b.id, { is_selected: false, is_approved: false })
      )
    );

    const g = await base44.asServiceRole.entities.Task.updateMany(
      { id: taskId, status: { $in: ['en_evaluacion', 'pendiente_aprobacion_comite'] } },
      { $set: { status: 'en_evaluacion', rejection_reason: reason, selected_budget_id: '', committee_suggested_budget_id: '' } }
    );
    if (!g.updated) return Response.json({ error: 'La tarea ya no estaba en una etapa rechazable' }, { status: 409 });

    await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'status_change', user,
      details: `Rechazo → en_evaluacion: "${reason}"`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}