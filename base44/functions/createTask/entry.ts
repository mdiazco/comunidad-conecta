import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, getMembership, writeAudit } from '../../shared/voting.ts';

// Crea una tarea. Requiere admin de plataforma o administrador de la comunidad.
// La comunidad de la tarea debe coincidir con una comunidad del usuario.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const communityId = body?.community_id;
    const title = (body?.title || '').trim();
    const taskType = body?.task_type;
    const priority = body?.priority;
    if (!communityId || !title || !taskType || !priority) {
      return Response.json({ error: 'Faltan campos requeridos: community_id, title, task_type, priority' }, { status: 400 });
    }

    if (!isPlatformAdmin(user)) {
      const m = await getMembership(base44, user.email, communityId);
      if (!m || m.role !== 'administrador') {
        return Response.json({ error: 'Sin permiso: se requiere administrador de la comunidad' }, { status: 403 });
      }
    }

    const commList = await base44.asServiceRole.entities.Community.filter({ id: communityId });
    const comm = commList[0];
    if (!comm) return Response.json({ error: 'Comunidad no encontrada' }, { status: 404 });

    const requiresBudget = body.requires_budget === true;
    const status = requiresBudget ? 'pendiente_presupuestos' : 'creada';

    const created = await base44.asServiceRole.entities.Task.create({
      community_id: communityId,
      community_name: comm.name,
      title,
      description: body.description || '',
      task_type: taskType,
      priority,
      status,
      progress: 0,
      assigned_to: body.assigned_to || '',
      assigned_to_name: body.assigned_to_name || '',
      due_date: body.due_date || '',
      year: body.year || new Date().getFullYear(),
      origin: body.origin || 'manual',
      requires_budget: requiresBudget,
      created_by: user.email,
    });

    await writeAudit(base44, {
      entity_type: 'Task', entity_id: created.id, action: 'create', user,
      details: `Tarea creada "${title}" (${taskType}/${priority}) en ${comm.name}`,
      community_id: communityId,
    });

    return Response.json({ ok: true, task: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}