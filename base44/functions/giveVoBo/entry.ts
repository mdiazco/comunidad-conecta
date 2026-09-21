import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { canManageCommunity, writeAudit } from '../../shared/voting.ts';

// Da Visto Bueno del administrador: en_evaluacion → pendiente_aprobacion_comite.
// Requiere un presupuesto seleccionado y ≥3 presupuestos (o excepción).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.task_id;
    if (!taskId) return Response.json({ error: 'task_id requerido' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    if (!await canManageCommunity(base44, user, task.community_id)) {
      return Response.json({ error: 'Sin permiso: se requiere administrador de la comunidad' }, { status: 403 });
    }
    if (task.status !== 'en_evaluacion') {
      return Response.json({ error: `Etapa incorrecta: la tarea está en "${task.status}"` }, { status: 409 });
    }

    const budgets = await base44.asServiceRole.entities.Budget.filter({ task_id: taskId });
    if (budgets.length < 3 && !task.budget_exception_reason) {
      return Response.json({ error: `Se requieren mínimo 3 presupuestos (o una excepción). Actualmente: ${budgets.length}` }, { status: 400 });
    }
    const selected = budgets.find(b => b.is_selected);
    if (!selected) {
      return Response.json({ error: 'Debes seleccionar un presupuesto antes de dar el Visto Bueno' }, { status: 400 });
    }

    const g = await base44.asServiceRole.entities.Task.updateMany(
      { id: taskId, status: 'en_evaluacion' },
      { $set: { status: 'pendiente_aprobacion_comite', committee_suggested_budget_id: selected.id } }
    );
    if (!g.updated) return Response.json({ error: 'La tarea ya no estaba en evaluación' }, { status: 409 });

    await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'status_change', user,
      details: `en_evaluacion → pendiente_aprobacion_comite (VoBo; sugerido: ${selected.supplier_name})`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true, suggested_budget_id: selected.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}