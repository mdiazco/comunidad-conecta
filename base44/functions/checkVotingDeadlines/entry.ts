import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPlatformAdmin, writeAudit, notifyUser } from '../../shared/voting.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isPlatformAdmin(user)) return Response.json({ error: 'Solo admin de plataforma puede ejecutar el chequeo de plazos' }, { status: 403 });

    const now = new Date().toISOString();
    const tasks = await base44.asServiceRole.entities.Task.filter({ status: 'en_votacion_comite' });
    const expired = tasks.filter(t => t.voting_deadline && new Date(t.voting_deadline) < new Date(now));

    let moved = 0;
    for (const task of expired) {
      const guard = await base44.asServiceRole.entities.Task.updateMany(
        { id: task.id, status: 'en_votacion_comite' },
        {
          $set: {
            status: 'sin_quorum',
            voting_closed_reason: 'Plazo vencido sin decisión del comité',
            voting_closed_by: user.email,
            voting_closed_at: now,
          }
        }
      );
      if (guard.updated) {
        moved++;
        await writeAudit(base44, {
          entity_type: 'Task', entity_id: task.id, action: 'status_change', user,
          details: `en_votacion_comite → sin_quorum (plazo vencido ${task.voting_deadline})`,
          community_id: task.community_id,
        });
        // notificar al admin de la comunidad (committee_sent_by) y al contacto de la comunidad
        await notifyUser(base44, task.committee_sent_by || '',
          'Votación sin quórum — requiere tu decisión',
          `La votación de "${task.title}" venció sin decisión del comité. Decide: extender plazo, nueva ronda o rechazar.`,
          'general', task.community_id, `/tasks/${task.id}`);
      }
    }

    return Response.json({ ok: true, checked: tasks.length, expired: expired.length, movedToSinQuorum: moved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}