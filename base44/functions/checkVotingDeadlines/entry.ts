import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import {
  isPlatformAdmin, writeAudit, notifyUser, evaluateTaskVoting,
} from '../../shared/voting.ts';

// Cierra votaciones con plazo vencido.
// - Invocación directa HTTP con usuario: requiere admin de plataforma (403 si no).
// - Invocación desde el workflow programado (sin usuario): requiere el shared secret
//   exclusivo del workflow en el body (401 si falta o no coincide). Una llamada anónima
//   sin el token recibe 401.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    let actor;
    if (user) {
      if (!isPlatformAdmin(user)) return Response.json({ error: 'Solo admin de plataforma puede ejecutar el chequeo de plazos' }, { status: 403 });
      actor = user;
    } else {
      const body = await req.json().catch(() => ({}));
      const expectedToken = secrets.get('WORKFLOW_DEADLINE_TOKEN');
      if (!expectedToken || body?.token !== expectedToken) {
        return Response.json({ error: 'No autorizado: token del workflow inválido o ausente' }, { status: 401 });
      }
      actor = { email: 'system@workflow', full_name: 'Workflow programado', role: 'admin' };
    }

    const now = new Date().toISOString();
    let auditWarning;
    const tasks = await base44.asServiceRole.entities.Task.filter({ status: 'en_votacion_comite' });
    const expired = tasks.filter(t => t.voting_deadline && new Date(t.voting_deadline) < new Date(now));

    const summary = { approved: 0, rejected: 0, sinQuorum: 0 };
    for (const task of expired) {
      const { approve, reject, result } = await evaluateTaskVoting(base44, task);
      let newStatus;
      let reason;
      if (result.minMet && result.outcome === 'approved') {
        newStatus = 'pendiente_aprobacion_admin'; reason = 'plazo vencido — comité aprobó';
      } else if (result.minMet && result.outcome === 'rejected') {
        newStatus = 'rechazado_comite'; reason = 'plazo vencido — comité rechazó';
      } else {
        newStatus = 'sin_quorum'; reason = result.minMet ? 'plazo vencido en empate' : 'plazo vencido sin quórum';
      }

      const guard = await base44.asServiceRole.entities.Task.updateMany(
        { id: task.id, status: 'en_votacion_comite' },
        {
          $set: {
            status: newStatus,
            committee_votes_approve: approve,
            committee_votes_reject: reject,
            voting_closed_reason: reason,
            voting_closed_by: actor.email,
            voting_closed_at: now,
            ...(newStatus === 'pendiente_aprobacion_admin' ? { committee_approved_at: now } : {}),
          }
        }
      );
      if (guard.updated) {
        if (newStatus === 'pendiente_aprobacion_admin') summary.approved++;
        else if (newStatus === 'rechazado_comite') summary.rejected++;
        else summary.sinQuorum++;
        const _au = await writeAudit(base44, {
          entity_type: 'Task', entity_id: task.id, action: 'status_change', user: actor,
          details: `en_votacion_comite → ${newStatus} (${reason}; ${approve}/${reject})`,
          community_id: task.community_id,
        });
        if (!_au.ok) auditWarning = _au.error;
        await notifyUser(base44, task.committee_sent_by || '',
          newStatus === 'sin_quorum' ? 'Votación sin quórum — requiere tu decisión'
            : newStatus === 'pendiente_aprobacion_admin' ? 'Votación aprobada al vencer el plazo — pendiente tu aprobación final'
            : 'Votación rechazada al vencer el plazo',
          `La votación de "${task.title}" venció: ${approve} approve / ${reject} reject. ${newStatus === 'sin_quorum' ? 'Decide: extender, nueva ronda o rechazar.' : 'Revisa la tarea.'}`,
          'general', task.community_id, `/tasks/${task.id}`);
      }
    }

    return Response.json({ ok: true, checked: tasks.length, expired: expired.length, summary, actor: actor.email, auditWarning });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}