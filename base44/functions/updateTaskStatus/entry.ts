import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, getMemberships, writeAudit } from '../../shared/voting.ts';

// Transiciones de estado de una tarea (Iniciar / Finalizar / Observar) ejecutadas por
// un admin de comunidad/equipo (o el operativo asignado para start/finish) o comité (observe).
// No acepta identidad ni comunidad desde el cliente: usa el usuario autenticado del contexto
// y valida membresía activa en la comunidad de la tarea + rol adecuado + transición válida.
const ACTIONS = {
  start:   { to: 'en_ejecucion', from: ['asignada'],                 roles: ['administrador', 'equipo'], allowAssigned: true },
  finish:  { to: 'finalizada',   from: ['en_ejecucion'],             roles: ['administrador', 'equipo'], allowAssigned: true },
  observe: { to: 'observada',    from: ['finalizada'],               roles: ['comite'],                   allowAssigned: false },
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.task_id;
    const action = body?.action;
    const observationNote = (body?.observation_note || '').trim();
    if (!taskId || !ACTIONS[action]) {
      return Response.json({ error: 'task_id y action (start|finish|observe) requeridos' }, { status: 400 });
    }
    if (action === 'observe' && !observationNote) {
      return Response.json({ error: 'observation_note requerido para observar' }, { status: 400 });
    }

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const cfg = ACTIONS[action];
    if (!cfg.from.includes(task.status)) {
      return Response.json({ error: `Transición no válida: "${action}" no aplica al estado actual "${task.status}"` }, { status: 409 });
    }

    const isAssigned = (task.assigned_to || '').toLowerCase() === (user.email || '').toLowerCase();
    let allowed = isPlatformAdmin(user);
    if (!allowed) {
      const list = await getMemberships(base44, user.email, task.community_id);
      const hasRole = list.some(m => cfg.roles.includes(m.role));
      allowed = hasRole || (cfg.allowAssigned && isAssigned);
    }
    if (!allowed) {
      return Response.json({ error: `Sin permiso para "${action}" en esta tarea` }, { status: 403 });
    }

    if (action === 'finish' && Array.isArray(task.checklist_items) && task.checklist_items.length > 0) {
      const done = task.checklist_items.filter(i => i.completed).length;
      if (done < task.checklist_items.length) {
        return Response.json({ error: `No se puede finalizar: checklist incompleto (${done}/${task.checklist_items.length})` }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const patch = { status: cfg.to };
    if (action === 'start') patch.started_at = task.started_at || now;
    if (action === 'finish') { patch.finished_at = now; patch.progress = 100; }
    if (action === 'observe') patch.observation_note = observationNote;

    await base44.asServiceRole.entities.Task.update(taskId, patch);

    await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'update', user,
      details: `Estado: ${task.status} → ${cfg.to}${action === 'observe' ? ' (observación comité)' : ''}`,
      community_id: task.community_id,
    });

    return Response.json({ ok: true, status: cfg.to });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}