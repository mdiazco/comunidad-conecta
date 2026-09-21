import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, getMemberships, writeAudit } from '../../shared/voting.ts';

// Crea o actualiza un presupuesto. Requiere admin de plataforma, o administrador/equipo de la comunidad.
// La tarea debe estar en una etapa que permita editar presupuestos (no bloqueada).
const LOCKED = ['en_votacion_comite', 'aprobado_comite', 'rechazado_comite', 'pendiente_aprobacion_admin', 'aprobado_final', 'rechazado_final', 'asignada', 'en_ejecucion', 'finalizada', 'observada', 'cerrada_fin_año'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const id = body?.id || null;
    const taskId = body?.task_id;
    const supplierName = (body?.supplier_name || '').trim();
    const amount = Number(body?.amount);
    if (!taskId || !supplierName || !amount || amount <= 0) {
      return Response.json({ error: 'Faltan campos requeridos: task_id, supplier_name, amount (>0)' }, { status: 400 });
    }

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    if (!isPlatformAdmin(user)) {
      const list = await getMemberships(base44, user.email, task.community_id);
      if (!list.some(m => ['administrador', 'equipo'].includes(m.role))) {
        return Response.json({ error: 'Sin permiso: se requiere administrador o equipo de la comunidad' }, { status: 403 });
      }
    }

    if (LOCKED.includes(task.status)) {
      return Response.json({ error: `La tarea está en "${task.status}": los presupuestos están bloqueados` }, { status: 409 });
    }

    let result;
    if (id) {
      result = await base44.asServiceRole.entities.Budget.update(id, {
        supplier_name: supplierName,
        amount,
        description: body.description || '',
        file_url: body.file_url || '',
        notes: body.notes || '',
        supplier_id: body.supplier_id || '',
      });
    } else {
      result = await base44.asServiceRole.entities.Budget.create({
        task_id: taskId,
        community_id: task.community_id,
        supplier_name: supplierName,
        amount,
        description: body.description || '',
        file_url: body.file_url || '',
        notes: body.notes || '',
        supplier_id: body.supplier_id || '',
      });
    }

    await writeAudit(base44, {
      entity_type: 'Budget', entity_id: id || result.id, action: id ? 'update' : 'create', user,
      details: `Presupuesto ${id ? 'editado' : 'creado'}: ${supplierName} — ${amount} para tarea ${task.title}`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true, budget: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}