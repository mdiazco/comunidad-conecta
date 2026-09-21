import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { canManageCommunity, writeAudit } from '../../shared/voting.ts';

// Autoriza una excepción para requerir menos de 3 cotizaciones, con motivo.
// Solo en pendiente_presupuestos o en_evaluacion.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.task_id;
    const reason = (body?.reason || '').trim();
    if (!taskId) return Response.json({ error: 'task_id requerido' }, { status: 400 });
    if (!reason) return Response.json({ error: 'reason requerido (motivo de la excepción)' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    if (!await canManageCommunity(base44, user, task.community_id)) {
      return Response.json({ error: 'Sin permiso: se requiere administrador de la comunidad' }, { status: 403 });
    }
    if (!['pendiente_presupuestos', 'en_evaluacion'].includes(task.status)) {
      return Response.json({ error: `Etapa incorrecta: la tarea está en "${task.status}"` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const g = await base44.asServiceRole.entities.Task.updateMany(
      { id: taskId },
      { $set: { budget_exception_reason: reason, budget_exception_by: user.email, budget_exception_at: now } }
    );

    await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'update', user,
      details: `Excepción de cotizaciones autorizada: "${reason}"`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}