import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, getMemberships, writeAudit } from '../../shared/voting.ts';

// Actualiza el progreso de una tarea (y opcionalmente la finaliza si llega a 100).
// Puede ejecutarlo: el operativo asignado (assigned_to == su email), equipo/administrador
// de la comunidad, o admin de plataforma. La tarea debe estar en ejecución/asignada/finalizada.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.task_id;
    const progress = Number(body?.progress);
    if (!taskId) return Response.json({ error: 'task_id requerido' }, { status: 400 });
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return Response.json({ error: 'progress debe ser un número entre 0 y 100' }, { status: 400 });
    }

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const isAssigned = (task.assigned_to || '').toLowerCase() === (user.email || '').toLowerCase();
    let allowed = isAssigned || isPlatformAdmin(user);
    if (!allowed) {
      const list = await getMemberships(base44, user.email, task.community_id);
      if (list.some(m => ['administrador', 'equipo'].includes(m.role))) allowed = true;
    }
    if (!allowed) {
      return Response.json({ error: 'Sin permiso: no eres el responsable asignado ni administrador/equipo de la comunidad' }, { status: 403 });
    }

    if (!['asignada', 'en_ejecucion', 'finalizada'].includes(task.status)) {
      return Response.json({ error: `La tarea no está en ejecución (estado actual: "${task.status}")` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const patch = { progress };
    if (progress >= 100 && task.status !== 'finalizada') {
      patch.status = 'finalizada';
      patch.finished_at = now;
    } else if (progress > 0 && task.status === 'asignada') {
      patch.status = 'en_ejecucion';
      patch.started_at = task.started_at || now;
    }

    await base44.asServiceRole.entities.Task.update(taskId, patch);

    await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'update', user,
      details: `Progreso ${progress}%${patch.status ? ` → ${patch.status}` : ''}`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true, status: patch.status || task.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}