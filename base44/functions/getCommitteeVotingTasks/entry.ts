import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getCommitteeMembers, countValidVotes } from '../../shared/voting.ts';

// Tareas en el flujo de votación del comité para el usuario autenticado (rol comité).
// Devuelve, por tarea: presupuestos sanitizados, contadores "X de N votaron" y SU voto.
// No expone votos de otros miembros.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const memberships = await base44.asServiceRole.entities.CommunityMember.filter({
      user_email: user.email, status: 'active', role: 'comite',
    });
    if (memberships.length === 0) return Response.json({ ok: true, tasks: [] });

    const commIds = memberships.map(m => m.community_id);
    const VOTING_STATUSES = ['pendiente_aprobacion_comite', 'en_votacion_comite', 'aprobado_comite', 'rechazado_comite', 'pendiente_aprobacion_admin'];

    const tasks = await base44.asServiceRole.entities.Task.filter({ status: { $in: VOTING_STATUSES } });
    const mine = tasks.filter(t => commIds.includes(t.community_id));

    const result = [];
    for (const t of mine) {
      const members = await getCommitteeMembers(base44, t.community_id);
      const round = t.current_voting_round || 1;
      const roundVotes = await base44.asServiceRole.entities.CommitteeVote.filter({ task_id: t.id, round });
      const myVote = roundVotes.find(v => (v.voter_email || '').toLowerCase() === (user.email || '').toLowerCase());
      const { approve, reject } = countValidVotes(roundVotes, members.map(m => m.user_email));

      const budgets = await base44.asServiceRole.entities.Budget.filter({ task_id: t.id });
      result.push({
        id: t.id, title: t.title, status: t.status, community_id: t.community_id, community_name: t.community_name,
        task_type: t.task_type, priority: t.priority, description: t.description,
        current_voting_round: round, voting_deadline: t.voting_deadline,
        committee_votes_approve: approve, committee_votes_reject: reject,
        total_members: members.length, total_voted: roundVotes.length,
        suggested_budget_id: t.committee_suggested_budget_id,
        budgets: budgets.map(b => ({ id: b.id, supplier_name: b.supplier_name, amount: b.amount, description: b.description, is_selected: b.is_selected })),
        my_vote: myVote ? { vote: myVote.vote, comment: myVote.comment, voted_at: myVote.voted_at } : null,
      });
    }

    return Response.json({ ok: true, tasks: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}