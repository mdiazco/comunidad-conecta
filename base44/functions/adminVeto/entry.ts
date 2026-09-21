import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  canManageCommunity, getCommunityConfig, getCommitteeMembers,
  writeAudit, notifyUser,
} from '../../shared/voting.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.taskId;
    const reason = (body?.reason || '').trim();
    if (!taskId) return Response.json({ error: 'taskId requerido' }, { status: 400 });
    if (!reason) return Response.json({ error: 'reason (motivo del veto) es obligatorio' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const canManage = await canManageCommunity(base44, user, task.community_id);
    if (!canManage) return Response.json({ error: 'Sin permiso: se requiere admin de plataforma o administrador de la comunidad' }, { status: 403 });

    const config = await getCommunityConfig(base44, task.community_id);
    if (!config.admin_can_veto) {
      return Response.json({ error: 'El veto está desactivado para esta comunidad (admin_can_veto=false)' }, { status: 403 });
    }

    if (task.status !== 'pendiente_aprobacion_admin') {
      return Response.json({ error: `Etapa incorrecta: la tarea está en "${task.status}", no en "pendiente_aprobacion_admin"` }, { status: 409 });
    }

    const guard = await base44.asServiceRole.entities.Task.updateMany(
      { id: taskId, status: 'pendiente_aprobacion_admin' },
      {
        $set: {
          status: 'en_evaluacion',
          rejection_reason: reason,
          committee_votes_approve: 0,
          committee_votes_reject: 0,
          selected_budget_id: '',
          committee_suggested_budget_id: '',
          voting_deadline: '',
          committee_approved_at: '',
        },
      }
    );
    if (!guard.updated) {
      return Response.json({ error: 'La tarea ya no estaba pendiente de aprobación final (modificada simultáneamente)' }, { status: 409 });
    }

    // Deseleccionar y desaprobar presupuestos
    await base44.asServiceRole.entities.Budget.updateMany(
      { task_id: taskId, is_selected: true },
      { $set: { is_selected: false, is_approved: false } }
    );

    const _au = await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'status_change', user,
      details: `Veto del admin: pendiente_aprobacion_admin → en_evaluacion. Motivo: ${reason}`,
      community_id: task.community_id,
    });

    // Notificar al comité que su decisión fue vetada
    const members = await getCommitteeMembers(base44, task.community_id);
    await Promise.all(members.map(m =>
      notifyUser(base44, m.user_email, 'Decisión del comité vetada por el administrador',
        `El administrador vetó la aprobación de "${task.title}". Motivo: ${reason}. La tarea vuelve a evaluación.`,
        'general', task.community_id, `/tasks/${taskId}`)
    ));

    return Response.json({ ok: true, revertedTo: 'en_evaluacion', notified: members.length, auditWarning: _au.ok ? undefined : _au.error });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}