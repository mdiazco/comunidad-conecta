import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ThumbsUp, ThumbsDown, Users, CheckCircle2, XCircle,
  Clock, MessageSquare, AlertTriangle, Trophy, ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function formatCLP(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

export default function CommitteeVotingPanel({ task, user, communityConfig, onVoteComplete }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [adminRejectReason, setAdminRejectReason] = useState('');
  const [showAdminReject, setShowAdminReject] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const approvalMode = communityConfig?.approval_mode || 'majority';
  const minVotes = communityConfig?.min_committee_votes || 1;
  const adminCanVeto = communityConfig?.admin_can_veto !== false;

  // Fetch votes for this task
  const { data: votes = [] } = useQuery({
    queryKey: ['committee-votes', task.id],
    queryFn: () => base44.entities.CommitteeVote.filter({ task_id: task.id }),
    enabled: !!task.id,
  });

  // Fetch committee members
  const { data: members = [] } = useQuery({
    queryKey: ['community-members', task.community_id],
    queryFn: () => base44.entities.CommunityMember.filter({ community_id: task.community_id, status: 'active' }),
    enabled: !!task.community_id,
  });

  // Fetch suggested budget
  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', task.id],
    queryFn: () => base44.entities.Budget.filter({ task_id: task.id }),
    enabled: !!task.id,
  });

  const committeeMembers = members.filter(m => m.role === 'comite');
  const suggestedBudget = budgets.find(b => b.id === task.committee_suggested_budget_id);

  const approveCount = votes.filter(v => v.vote === 'approve').length;
  const rejectCount = votes.filter(v => v.vote === 'reject').length;
  const totalVotes = votes.length;
  const totalMembers = committeeMembers.length || 1;
  const approvalPct = totalVotes > 0 ? Math.round((approveCount / totalVotes) * 100) : 0;
  const participationPct = Math.round((totalVotes / totalMembers) * 100);

  const myVote = votes.find(v => v.voter_email === user?.email);
  const isCommitteeMember = committeeMembers.some(m => m.user_email === user?.email);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const hasEnoughVotes = totalVotes >= minVotes;
  const isApproved = approvalMode === 'unanimity'
    ? approveCount === totalMembers && totalVotes >= minVotes
    : approveCount > rejectCount && hasEnoughVotes;
  const isRejected = approvalMode === 'unanimity'
    ? rejectCount > 0 && hasEnoughVotes
    : rejectCount >= approveCount && hasEnoughVotes && totalVotes >= minVotes;

  const votedEmails = new Set(votes.map(v => v.voter_email));
  const pendingMembers = committeeMembers.filter(m => !votedEmails.has(m.user_email));

  const voteMutation = useMutation({
    mutationFn: async ({ voteType }) => {
      const now = new Date().toISOString();
      await base44.entities.CommitteeVote.create({
        task_id: task.id,
        community_id: task.community_id,
        voter_email: user.email,
        voter_name: user.full_name || user.email,
        vote: voteType,
        comment: comment.trim() || undefined,
        budget_id: task.committee_suggested_budget_id || undefined,
        voted_at: now,
      });

      // Recalculate and check thresholds
      const updatedVotes = await base44.entities.CommitteeVote.filter({ task_id: task.id });
      const newApprove = updatedVotes.filter(v => v.vote === 'approve').length;
      const newReject = updatedVotes.filter(v => v.vote === 'reject').length;
      const newTotal = updatedVotes.length;

      const newApproved = approvalMode === 'unanimity'
        ? newApprove === totalMembers && newTotal >= minVotes
        : newApprove > newReject && newTotal >= minVotes;
      const newRejected = approvalMode === 'unanimity'
        ? newReject > 0 && newTotal >= minVotes
        : newReject >= newApprove && newTotal >= minVotes && newApprove === 0;

      let newStatus = 'en_votacion_comite';
      if (newApproved) newStatus = 'aprobado_comite';
      else if (newRejected) newStatus = 'rechazado_comite';

      await base44.entities.Task.update(task.id, {
        status: newStatus,
        committee_votes_approve: newApprove,
        committee_votes_reject: newReject,
        ...(newApproved ? { committee_approved_at: now, status: 'pendiente_aprobacion_admin' } : {}),
        ...(newRejected ? { committee_rejection_reason: comment || 'Rechazado por el comité' } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committee-votes', task.id] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setComment('');
      setShowComment(false);
      toast.success('Voto registrado');
      onVoteComplete?.();
    },
  });

  const adminApproveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const selectedBudget = budgets.find(b => b.is_selected) || suggestedBudget;
      if (!selectedBudget) throw new Error('No hay presupuesto seleccionado');

      // Mark budget as approved
      await base44.entities.Budget.update(selectedBudget.id, {
        is_approved: true,
        approved_by: user.email,
        approved_by_name: user.full_name || user.email,
        approved_at: now,
      });

      // Approve task and transition to "asignada" (order of work generated — ready for execution)
      await base44.entities.Task.update(task.id, {
        status: 'asignada',
        approved_by: user.email,
        approved_by_name: user.full_name || user.email,
        approved_at: now,
        selected_budget_id: selectedBudget.id,
        selected_budget_supplier: selectedBudget.supplier_name,
        selected_budget_amount: selectedBudget.amount,
        work_order_generated: true,
        supplier_id: selectedBudget.supplier_id || task.supplier_id || '',
        supplier_name: selectedBudget.supplier_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', task.id] });
      toast.success('✅ Presupuesto aprobado — Orden de trabajo generada. Tarea lista para ejecución.');
    },
  });

  const adminRejectMutation = useMutation({
    mutationFn: async () => {
      if (!adminRejectReason.trim()) throw new Error('Escribe el motivo de rechazo');
      const budgetsToReset = budgets.filter(b => b.is_selected);
      await Promise.all(budgetsToReset.map(b =>
        base44.entities.Budget.update(b.id, { is_selected: false, is_approved: false })
      ));
      await base44.entities.Task.update(task.id, {
        status: 'en_evaluacion',
        rejection_reason: adminRejectReason,
        selected_budget_id: '',
        committee_votes_approve: 0,
        committee_votes_reject: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', task.id] });
      setAdminRejectReason('');
      setShowAdminReject(false);
      toast.info('Tarea devuelta a evaluación para nuevos presupuestos');
    },
  });

  const isPreVoting = task.status === 'pendiente_aprobacion_comite';
  const isVotingOpen = task.status === 'en_votacion_comite';
  const isAdminApprovalPending = task.status === 'pendiente_aprobacion_admin';
  const isFinalApproved = ['asignada', 'en_ejecucion', 'finalizada'].includes(task.status) && task.work_order_generated;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Votación del Comité</h2>
              <p className="text-xs text-muted-foreground">
                {committeeMembers.length} miembro{committeeMembers.length !== 1 ? 's' : ''} ·{' '}
                {approvalMode === 'unanimity' ? 'Unanimidad requerida' : 'Mayoría simple'}
                {minVotes > 1 && ` · Mín. ${minVotes} votos`}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Pre-voting: show committee members who will vote */}
      {isPreVoting && committeeMembers.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Miembros que votarán</p>
          <div className="space-y-1.5">
            {committeeMembers.map(member => (
              <div key={member.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
                <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-violet-600">
                    {(member.user_name || member.user_email || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{member.user_name || member.user_email}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{member.user_email}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Pendiente envío
                </span>
              </div>
            ))}
          </div>
          {committeeMembers.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-2">
              No hay miembros de comité asignados a esta comunidad
            </p>
          )}
        </div>
      )}

      {/* Suggested budget */}
      {suggestedBudget && (
        <div className="mx-4 mt-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Trophy className="h-4 w-4 text-blue-600 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-700">Presupuesto sugerido por el Administrador</p>
            <p className="text-sm font-bold text-blue-800">{suggestedBudget.supplier_name} — {formatCLP(suggestedBudget.amount)}</p>
            {suggestedBudget.description && (
              <p className="text-xs text-blue-600 mt-0.5">{suggestedBudget.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Vote stats */}
      {(isVotingOpen || task.status === 'aprobado_comite' || task.status === 'rechazado_comite' || isAdminApprovalPending || isFinalApproved) && (
        <div className="px-5 py-4 space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-foreground">{approveCount} aprobaciones</span>
              <span className="text-muted-foreground">{rejectCount} rechazos</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden flex">
              {totalVotes > 0 && (
                <>
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${approvalPct}%` }}
                  />
                  <div
                    className="h-full bg-red-400 transition-all duration-500"
                    style={{ width: `${100 - approvalPct}%` }}
                  />
                </>
              )}
              {totalVotes === 0 && <div className="h-full w-full bg-muted" />}
            </div>
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>{approvalPct}% aprobación</span>
              <span>{totalVotes} de {totalMembers} votos ({participationPct}% participación)</span>
            </div>
          </div>

          {/* Member vote list */}
          <div className="space-y-1.5">
            {committeeMembers.map(member => {
              const memberVote = votes.find(v => v.voter_email === member.user_email);
              return (
                <div key={member.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">
                      {(member.user_name || member.user_email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{member.user_name || member.user_email}</p>
                    {memberVote?.comment && (
                      <p className="text-[10px] text-muted-foreground italic truncate">"{memberVote.comment}"</p>
                    )}
                  </div>
                  {memberVote ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {memberVote.vote === 'approve' ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <CheckCircle2 className="h-3 w-3" /> Aprobó
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          <XCircle className="h-3 w-3" /> Rechazó
                        </span>
                      )}
                      {memberVote.voted_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(memberVote.voted_at), "d MMM", { locale: es })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> Pendiente
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My vote panel (committee member) */}
      {isVotingOpen && isCommitteeMember && !myVote && (
        <div className="mx-4 mb-4 p-4 border border-border rounded-xl bg-muted/20">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Tu voto
          </p>

          {showComment && (
            <Textarea
              rows={2}
              placeholder="Comentario (opcional)..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="resize-none text-sm mb-3"
            />
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
              disabled={voteMutation.isPending}
              onClick={() => voteMutation.mutate({ voteType: 'approve' })}
            >
              <ThumbsUp className="h-3.5 w-3.5" /> Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
              disabled={voteMutation.isPending}
              onClick={() => voteMutation.mutate({ voteType: 'reject' })}
            >
              <ThumbsDown className="h-3.5 w-3.5" /> Rechazar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs h-8 text-muted-foreground"
              onClick={() => setShowComment(v => !v)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {showComment ? 'Ocultar comentario' : 'Agregar comentario'}
            </Button>
          </div>
        </div>
      )}

      {/* Already voted */}
      {isVotingOpen && isCommitteeMember && myVote && (
        <div className="mx-4 mb-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 font-medium">
            Ya votaste: <strong>{myVote.vote === 'approve' ? 'Aprobación' : 'Rechazo'}</strong>
            {myVote.comment && <span className="font-normal"> — "{myVote.comment}"</span>}
          </p>
        </div>
      )}

      {/* Admin approval step */}
      {isAdminApprovalPending && isAdmin && (
        <div className="mx-4 mb-4 p-4 border border-amber-200 bg-amber-50 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">Pendiente tu aprobación final</p>
          </div>
          <p className="text-xs text-amber-700">
            El comité aprobó este presupuesto. Revisa la decisión y confirma o rechaza.
          </p>

          {!showAdminReject && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
                disabled={adminApproveMutation.isPending}
                onClick={() => adminApproveMutation.mutate()}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar definitivamente
              </Button>
              {adminCanVeto && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setShowAdminReject(true)}
                >
                  <XCircle className="h-3.5 w-3.5" /> Vetar decisión del comité
                </Button>
              )}
            </div>
          )}

          {showAdminReject && (
            <div className="space-y-2">
              <Textarea
                rows={2}
                placeholder="Motivo del veto/rechazo (obligatorio)..."
                value={adminRejectReason}
                onChange={e => setAdminRejectReason(e.target.value)}
                className="resize-none text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs h-7 gap-1"
                  disabled={adminRejectMutation.isPending}
                  onClick={() => adminRejectMutation.mutate()}
                >
                  <XCircle className="h-3 w-3" /> Confirmar rechazo
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowAdminReject(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Final approved — work order generated */}
      {isFinalApproved && (
        <div className="mx-4 mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-700">✅ Presupuesto aprobado — Orden de trabajo generada</p>
          </div>
          {task.selected_budget_supplier && (
            <p className="text-xs text-emerald-700 font-medium">
              Proveedor: <strong>{task.selected_budget_supplier}</strong>
              {task.selected_budget_amount ? ` · ${formatCLP(task.selected_budget_amount)}` : ''}
            </p>
          )}
          <p className="text-xs text-emerald-600">
            Aprobado por {task.approved_by_name}
            {task.approved_at ? ` · ${format(new Date(task.approved_at), "d 'de' MMMM yyyy", { locale: es })}` : ''}
          </p>
          <p className="text-xs text-emerald-600 italic">
            La tarea ha sido asignada al proveedor y está lista para iniciar ejecución.
          </p>
        </div>
      )}

      {/* Vote history toggle */}
      {votes.length > 0 && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showHistory ? 'Ocultar' : 'Ver'} historial de votos ({votes.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {votes.map(v => (
                <div key={v.id} className="flex items-start gap-2 text-xs border-l-2 border-border pl-2">
                  <span className={cn("font-semibold shrink-0", v.vote === 'approve' ? 'text-emerald-600' : 'text-red-500')}>
                    {v.voter_name || v.voter_email}
                  </span>
                  <span className="text-muted-foreground">
                    {v.vote === 'approve' ? 'aprobó' : 'rechazó'}
                    {v.comment && ` — "${v.comment}"`}
                    {' · '}
                    {v.voted_at ? format(new Date(v.voted_at), "d MMM HH:mm", { locale: es }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pendiente_aprobacion_comite: { label: 'Pend. envío al Comité', class: 'bg-amber-50 text-amber-700 border-amber-200' },
    en_votacion_comite:          { label: 'En votación', class: 'bg-violet-50 text-violet-700 border-violet-200' },
    aprobado_comite:             { label: 'Aprobado por Comité', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rechazado_comite:            { label: 'Rechazado por Comité', class: 'bg-red-50 text-red-700 border-red-200' },
    pendiente_aprobacion_admin:  { label: 'Pend. Admin', class: 'bg-amber-50 text-amber-700 border-amber-200' },
    aprobado_final:              { label: 'Aprobado Final', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rechazado_final:             { label: 'Rechazado Final', class: 'bg-red-50 text-red-700 border-red-200' },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-md border', s.class)}>
      {s.label}
    </span>
  );
}