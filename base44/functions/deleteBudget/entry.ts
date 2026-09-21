import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, getMembership, writeAudit } from '../../shared/voting.ts';

const LOCKED = ['en_votacion_comite', 'aprobado_comite', 'rechazado_comite', 'pendiente_aprobacion_admin', 'aprobado_final', 'rechazado_final', 'asignada', 'en_ejecucion', 'finalizada', 'observada', 'cerrada_fin_año'];

// Elimina un presupuesto. Requiere admin de plataforma, o administrador/equipo de la comunidad.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const id = body?.id;
    if (!id) return Response.json({ error: 'id requerido' }, { status: 400 });

    const list = await base44.asServiceRole.entities.Budget.filter({ id });
    const budget = list[0];
    if (!budget) return Response.json({ error: 'Presupuesto no encontrado' }, { status: 404 });

    if (budget.is_approved) {
      return Response.json({ error: 'No se puede eliminar un presupuesto ya aprobado' }, { status: 409 });
    }

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: budget.task_id });
    const task = taskList[0];
    if (task && LOCKED.includes(task.status)) {
      return Response.json({ error: `La tarea está en "${task.status}": los presupuestos están bloqueados` }, { status: 409 });
    }

    if (task && !isPlatformAdmin(user)) {
      const m = await getMembership(base44, user.email, task.community_id);
      if (!m || !['administrador', 'equipo'].includes(m.role)) {
        return Response.json({ error: 'Sin permiso: se requiere administrador o equipo de la comunidad' }, { status: 403 });
      }
    }

    await base44.asServiceRole.entities.Budget.delete(id);
    await writeAudit(base44, {
      entity_type: 'Budget', entity_id: id, action: 'delete', user,
      details: `Presupuesto eliminado: ${budget.supplier_name} — ${budget.amount}`,
      community_id: budget.community_id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}