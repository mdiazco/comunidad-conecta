import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, DollarSign, CheckCircle2, TrendingDown, TrendingUp,
  AlertTriangle, ThumbsUp, ThumbsDown, Trophy, Clock, User
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import BudgetFormDialog from './BudgetFormDialog';

const MIN_BUDGETS = 3;

function formatCLP(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

export default function BudgetPanel({ task, canApprove, user }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', task.id],
    queryFn: () => base44.entities.Budget.filter({ task_id: task.id }),
    enabled: !!task.id,
  });

  const taskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const budgetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Budget.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets', task.id] }),
  });

  const sorted = [...budgets].sort((a, b) => a.amount - b.amount);
  const minAmount = sorted[0]?.amount ?? null;
  const maxAmount = sorted[sorted.length - 1]?.amount ?? null;
  const avgAmount = budgets.length > 0 ? budgets.reduce((s, b) => s + b.amount, 0) / budgets.length : null;
  const selectedBudget = budgets.find(b => b.is_selected);

  const canAdvanceToEvaluation = budgets.length >= MIN_BUDGETS && task.status === 'pendiente_presupuestos';
  const canApproveAction = canApprove && task.status === 'pendiente_aprobacion' && selectedBudget;

  const handleSelectBudget = async (budget) => {
    if (!canApprove) return;
    // Deselect others
    await Promise.all(
      budgets.filter(b => b.id !== budget.id && b.is_selected)
        .map(b => base44.entities.Budget.update(b.id, { is_selected: false }))
    );
    await base44.entities.Budget.update(budget.id, { is_selected: true });
    queryClient.invalidateQueries({ queryKey: ['budgets', task.id] });

    // Move to pendiente_aprobacion if in en_evaluacion
    if (task.status === 'en_evaluacion') {
      taskMutation.mutate({ status: 'pendiente_aprobacion' });
    }
  };

  const handleAdvanceToEvaluation = () => {
    taskMutation.mutate({ status: 'en_evaluacion' });
    toast.success('Tarea avanzada a evaluación');
  };

  const handleApprove = () => {
    if (!selectedBudget) { toast.error('Selecciona un presupuesto primero'); return; }
    const now = new Date().toISOString();
    budgetMutation.mutate({
      id: selectedBudget.id,
      data: {
        is_approved: true,
        approved_by: user?.email,
        approved_by_name: user?.full_name || user?.email,
        approved_at: now,
      }
    });
    taskMutation.mutate({
      status: 'aprobada',
      selected_budget_id: selectedBudget.id,
      selected_budget_supplier: selectedBudget.supplier_name,
      selected_budget_amount: selectedBudget.amount,
      approved_by: user?.email,
      approved_by_name: user?.full_name || user?.email,
      approved_at: now,
    });
    toast.success('Presupuesto aprobado — tarea lista para ejecución');
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) { toast.error('Escribe el motivo de rechazo'); return; }
    // Reset budgets selection
    Promise.all(budgets.filter(b => b.is_selected).map(b =>
      base44.entities.Budget.update(b.id, { is_selected: false, is_approved: false })
    )).then(() => queryClient.invalidateQueries({ queryKey: ['budgets', task.id] }));
    taskMutation.mutate({
      status: 'en_evaluacion',
      rejection_reason: rejectionReason,
      selected_budget_id: '',
    });
    setRejectionReason('');
    setShowRejectForm(false);
    toast.info('Tarea vuelta a evaluación para nuevos presupuestos');
  };

  const STATUS_LABELS = {
    pendiente_presupuestos: { label: 'Pendiente de presupuestos', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    en_evaluacion: { label: 'En evaluación', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    pendiente_aprobacion: { label: 'Pendiente de aprobación', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    aprobada: { label: 'Aprobada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rechazada: { label: 'Rechazada', color: 'bg-red-50 text-red-700 border-red-200' },
  };

  const statusInfo = STATUS_LABELS[task.status];

  if (isLoading) return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center h-32">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Presupuestos</h2>
            <p className="text-xs text-muted-foreground">
              {budgets.length} de {MIN_BUDGETS} mínimos requeridos
            </p>
          </div>
          {statusInfo && (
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-md border', statusInfo.color)}>
              {statusInfo.label}
            </span>
          )}
        </div>
        {!['aprobada', 'finalizada', 'observada', 'cerrada_fin_año'].includes(task.status) && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" /> Agregar presupuesto
          </Button>
        )}
      </div>

      {/* Stats row */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-muted/20">
          <div className="px-4 py-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Más barato</p>
              <p className="text-sm font-bold text-emerald-600">{minAmount !== null ? formatCLP(minAmount) : '—'}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Promedio</p>
              <p className="text-sm font-bold text-foreground">{avgAmount !== null ? formatCLP(Math.round(avgAmount)) : '—'}</p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-red-500 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Más caro</p>
              <p className="text-sm font-bold text-red-500">{maxAmount !== null ? formatCLP(maxAmount) : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Approved banner */}
      {task.status === 'aprobada' && task.selected_budget_supplier && (
        <div className="mx-4 mt-4 flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Trophy className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700">Presupuesto aprobado</p>
            <p className="text-xs text-emerald-600">
              {task.selected_budget_supplier} — {task.selected_budget_amount ? formatCLP(task.selected_budget_amount) : ''}
            </p>
          </div>
          {task.approved_at && (
            <div className="text-right shrink-0">
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(task.approved_at), "d MMM yyyy", { locale: es })}
              </p>
              {task.approved_by_name && (
                <p className="text-xs text-emerald-600 flex items-center gap-1 justify-end">
                  <User className="h-3 w-3" />
                  {task.approved_by_name}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rejection note */}
      {task.rejection_reason && (
        <div className="mx-4 mt-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700">Motivo de rechazo</p>
            <p className="text-xs text-red-600 mt-0.5">{task.rejection_reason}</p>
          </div>
        </div>
      )}

      {/* Budget table */}
      {budgets.length === 0 ? (
        <div className="py-10 text-center px-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <DollarSign className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">No hay presupuestos aún</p>
          <p className="text-xs text-muted-foreground mt-1">Se requieren mínimo {MIN_BUDGETS} para avanzar a evaluación</p>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="mt-3 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Agregar primer presupuesto
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((budget, idx) => {
            const isCheapest = budget.amount === minAmount && budgets.length > 1;
            const isMostExpensive = budget.amount === maxAmount && budgets.length > 1;
            const isSelected = budget.is_selected;
            const isApproved = budget.is_approved;

            return (
              <div
                key={budget.id}
                className={cn(
                  'px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3',
                  isSelected && 'bg-blue-50/60',
                  isApproved && 'bg-emerald-50/60',
                )}
              >
                {/* Rank */}
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                  {idx + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{budget.supplier_name}</p>
                    {isCheapest && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                        <TrendingDown className="h-2.5 w-2.5" /> Más barato
                      </span>
                    )}
                    {isMostExpensive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 flex items-center gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5" /> Más caro
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Aprobado
                      </span>
                    )}
                    {isSelected && !isApproved && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                        Seleccionado
                      </span>
                    )}
                  </div>
                  {budget.description && (
                    <p className="text-xs text-muted-foreground truncate">{budget.description}</p>
                  )}
                  {budget.notes && (
                    <p className="text-xs text-muted-foreground/70 italic">{budget.notes}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Ingresado {format(new Date(budget.created_date), "d MMM yyyy", { locale: es })}
                  </p>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                  <p className={cn(
                    'text-base font-extrabold tabular-nums',
                    isCheapest ? 'text-emerald-600' : isMostExpensive ? 'text-red-500' : 'text-foreground'
                  )}>
                    {formatCLP(budget.amount)}
                  </p>
                  {avgAmount !== null && (
                    <p className={cn(
                      'text-[10px] font-medium',
                      budget.amount < avgAmount ? 'text-emerald-600' : 'text-red-500'
                    )}>
                      {budget.amount < avgAmount
                        ? `${formatCLP(Math.round(avgAmount - budget.amount))} bajo promedio`
                        : `${formatCLP(Math.round(budget.amount - avgAmount))} sobre promedio`
                      }
                    </p>
                  )}
                </div>

                {/* Select button */}
                {canApprove && ['en_evaluacion', 'pendiente_aprobacion'].includes(task.status) && (
                  <Button
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn('shrink-0 text-xs h-7 gap-1', isSelected && 'bg-blue-600 hover:bg-blue-700')}
                    onClick={() => handleSelectBudget(budget)}
                  >
                    {isSelected ? <CheckCircle2 className="h-3 w-3" /> : null}
                    {isSelected ? 'Seleccionado' : 'Seleccionar'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action bar */}
      <div className="px-5 py-4 border-t border-border bg-muted/20 flex flex-wrap items-center gap-3">
        {/* Advance to evaluation */}
        {canAdvanceToEvaluation && canApprove && (
          <Button size="sm" onClick={handleAdvanceToEvaluation} className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700">
            Avanzar a Evaluación ({budgets.length}/{MIN_BUDGETS})
          </Button>
        )}
        {!canAdvanceToEvaluation && task.status === 'pendiente_presupuestos' && (
          <p className="text-xs text-muted-foreground">
            Faltan {Math.max(0, MIN_BUDGETS - budgets.length)} presupuesto(s) para avanzar
          </p>
        )}

        {/* Approve */}
        {canApproveAction && !showRejectForm && (
          <>
            <Button size="sm" onClick={handleApprove} className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700">
              <ThumbsUp className="h-3.5 w-3.5" /> Aprobar presupuesto
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRejectForm(true)} className="gap-1.5 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50">
              <ThumbsDown className="h-3.5 w-3.5" /> Rechazar
            </Button>
          </>
        )}

        {/* Reject form */}
        {showRejectForm && (
          <div className="w-full flex flex-col gap-2">
            <Textarea
              rows={2}
              placeholder="Motivo del rechazo (obligatorio)..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleReject} className="text-xs h-7 gap-1">
                <ThumbsDown className="h-3 w-3" /> Confirmar rechazo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRejectForm(false)} className="text-xs h-7">Cancelar</Button>
            </div>
          </div>
        )}

        {/* Status info */}
        {task.status === 'pendiente_aprobacion' && !selectedBudget && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Selecciona un presupuesto para aprobar
          </p>
        )}
      </div>

      <BudgetFormDialog open={addOpen} onOpenChange={setAddOpen} taskId={task.id} communityId={task.community_id} />
    </div>
  );
}