import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  canManageCommunity, getCommunityConfig, getCommitteeMembers, countValidVotes, computeResult, writeAudit, notifyUser,
} from '../../shared/voting.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const taskId = body?.taskId;
    if (!taskId) return Response.json({ error: 'taskId requerido' }, { status: 400 });

    const taskList = await base44.asServiceRole.entities.Task.filter({ id: taskId });
    const task = taskList[0];
    if (!task) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

    const canManage = await canManageCommunity(base44, user, task.community_id);
    if (!canManage) return Response.json({ error: 'Sin permiso: se requiere admin de plataforma o administrador de la comunidad' }, { status: 403 });

    const config = await getCommunityConfig(base44, task.community_id);

    // Separación de funciones: si el admin votó como comité en la ronda actual y la comunidad no lo permite
    const myVotes = await base44.asServiceRole.entities.CommitteeVote.filter({
      task_id: taskId, voter_email: user.email, round: task.current_voting_round || 1,
    });
    if (myVotes.length > 0 && !config.allow_admin_committee_double_role) {
      return Response.json({ error: 'Aprobaste como comité en esta ronda: no puedes dar la aprobación final (separación de funciones). Esta comunidad no tiene activado el flag allow_admin_committee_double_role.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    let auditWarning;

    // IDEMPOTENCIA + REPARABILIDAD: si la orden ya está generada
    if (task.work_order_generated) {
      const selectedBudget = await getSelectedBudget(base44, task);
      if (selectedBudget && !selectedBudget.is_approved) {
        await base44.asServiceRole.entities.Budget.update(selectedBudget.id, {
          is_approved: true,
          approved_by: user.email,
          approved_by_name: user.full_name || user.email,
          approved_at: task.approved_at || now,
        });
        const _auRepair = await writeAudit(base44, {
          entity_type: 'Budget', entity_id: selectedBudget.id, action: 'update', user,
          details: `Reparación: marcado is_approved=true (orden ya estaba generada)`,
          community_id: task.community_id,
        });
        if (!_auRepair.ok) auditWarning = _auRepair.error;
        return Response.json({ ok: true, repaired: true, message: 'Orden ya estaba generada; se completó is_approved faltante.', auditWarning });
      }
      return Response.json({ ok: true, alreadyApproved: true, message: 'La orden de trabajo ya estaba generada.' });
    }

    if (task.status !== 'pendiente_aprobacion_admin') {
      return Response.json({ error: `Etapa incorrecta: la tarea está en "${task.status}", no en "pendiente_aprobacion_admin"` }, { status: 409 });
    }

    // Verificar que el comité aprobó en la ronda actual (votos válidos recomputados)
    const committeeMembers = await getCommitteeMembers(base44, task.community_id);
    const committeeEmails = committeeMembers.map(m => m.user_email);
    const roundVotes = await base44.asServiceRole.entities.CommitteeVote.filter({ task_id: taskId, round: task.current_voting_round || 1 });
    const { approve: cApprove, reject: cReject } = countValidVotes(roundVotes, committeeEmails);
    const committeeResult = computeResult(cApprove, cReject, committeeMembers.length, config);
    if (committeeResult.outcome !== 'approved') {
      return Response.json({ error: `El comité no aprobó el presupuesto en la ronda actual. Resultado recomputado: "${committeeResult.outcome}" (${committeeResult.reason}). Votos válidos: ${cApprove} approve / ${cReject} reject sobre ${committeeMembers.length} miembros activos del comité. No se puede dar la aprobación final.` }, { status: 409 });
    }

    const selectedBudget = await getSelectedBudget(base44, task);
    if (!selectedBudget) {
      return Response.json({ error: 'No hay presupuesto seleccionado para aprobar' }, { status: 400 });
    }

    // Guarda atómica: solo avanza si sigue pendiente_aprobacion_admin y work_order_generated=false
    const guard = await base44.asServiceRole.entities.Task.updateMany(
      { id: taskId, status: 'pendiente_aprobacion_admin', work_order_generated: false },
      {
        $set: {
          status: 'asignada',
          work_order_generated: true,
          approved_by: user.email,
          approved_by_name: user.full_name || user.email,
          approved_at: now,
          selected_budget_id: selectedBudget.id,
          selected_budget_supplier: selectedBudget.supplier_name,
          selected_budget_amount: selectedBudget.amount,
          supplier_id: selectedBudget.supplier_id || task.supplier_id || '',
          supplier_name: selectedBudget.supplier_name,
        },
      }
    );
    if (!guard.updated) {
      // alguien más la aprobó simultáneamente → idempotente
      return Response.json({ ok: true, concurrent: true, message: 'La tarea fue aprobada simultáneamente por otra solicitud; no se hicieron cambios duplicados.' });
    }

    // Marcar el presupuesto como aprobado (escritura separada; si falla, la orden ya está generada y es reparable reinvocando)
    await base44.asServiceRole.entities.Budget.update(selectedBudget.id, {
      is_approved: true,
      approved_by: user.email,
      approved_by_name: user.full_name || user.email,
      approved_at: now,
    });

    const _au1 = await writeAudit(base44, {
      entity_type: 'Task', entity_id: taskId, action: 'status_change', user,
      details: `pendiente_aprobacion_admin → asignada (orden de trabajo generada, presupuesto ${selectedBudget.supplier_name} ${selectedBudget.amount})`,
      community_id: task.community_id,
    });
    if (!_au1.ok) auditWarning = _au1.error;
    const _au2 = await writeAudit(base44, {
      entity_type: 'Budget', entity_id: selectedBudget.id, action: 'update', user,
      details: `Presupuesto aprobado definitivamente (tarea ${task.title})`,
      community_id: task.community_id,
    });
    if (!_au2.ok) auditWarning = _au2.error;

    await notifyUser(base44, task.assigned_to || task.committee_sent_by || '',
      'Orden de trabajo generada',
      `La reparación "${task.title}" fue aprobada y asignada a ${selectedBudget.supplier_name}.`,
      'task_assigned', task.community_id, `/tasks/${taskId}`);

    return Response.json({ ok: true, workOrderGenerated: true, supplier: selectedBudget.supplier_name, amount: selectedBudget.amount, auditWarning });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function getSelectedBudget(base44, task) {
  if (task.selected_budget_id) {
    try {
      const b = await base44.asServiceRole.entities.Budget.get(task.selected_budget_id);
      if (b) return b;
    } catch (_e) { /* fall through */ }
  }
  const list = await base44.asServiceRole.entities.Budget.filter({ task_id: task.id, is_selected: true });
  return list[0] || null;
}