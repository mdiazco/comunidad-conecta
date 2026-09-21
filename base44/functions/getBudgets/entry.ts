import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, getMemberships } from '../../shared/voting.ts';

// Presupuestos de una tarea, sanitizados. Requiere admin de plataforma o membresía activa
// (cualquier rol) de la comunidad de la tarea.
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

    if (!isPlatformAdmin(user)) {
      const list = await getMemberships(base44, user.email, task.community_id);
      if (list.length === 0) return Response.json({ error: 'No eres miembro activo de esta comunidad' }, { status: 403 });
    }

    const budgets = await base44.asServiceRole.entities.Budget.filter({ task_id: taskId });
    return Response.json({
      ok: true,
      budgets: budgets.map(b => ({
        id: b.id, supplier_name: b.supplier_name, amount: b.amount, description: b.description,
        file_url: b.file_url, notes: b.notes, is_selected: b.is_selected, is_approved: b.is_approved,
        supplier_id: b.supplier_id, created_date: b.created_date,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}