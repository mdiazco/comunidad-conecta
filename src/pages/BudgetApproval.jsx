import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  DollarSign, Clock, CheckCircle2, XCircle, AlertTriangle,
  Users, Trophy, ArrowRight, Filter, X, Search, Building2, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { isSuperAdmin } from '@/lib/permissions';

function formatCLP(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

const STATUS_CONFIG = {
  pendiente_presupuestos:     { label: 'Pend. presupuestos',    class: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400',   stage: 1 },
  en_evaluacion:              { label: 'En evaluación',         class: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    stage: 2 },
  en_votacion_comite:         { label: 'En votación',           class: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-500',  stage: 3 },
  aprobado_comite:            { label: 'Aprobado Comité',       class: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-400', stage: 4 },
  rechazado_comite:           { label: 'Rechazado Comité',      class: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',     stage: -1 },
  pendiente_aprobacion_admin: { label: 'Pend. aprobación',      class: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   stage: 4 },
  aprobado_final:             { label: 'Aprobado Final',        class: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', stage: 5 },
  rechazado_final:            { label: 'Rechazado Final',       class: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',     stage: -1 },
};

const BUDGET_FLOW_STATUSES = [
  'pendiente_presupuestos', 'en_evaluacion', 'en_votacion_comite',
  'aprobado_comite', 'rechazado_comite', 'pendiente_aprobacion_admin',
  'aprobado_final', 'rechazado_final',
];

const FILTER_TABS = [
  { key: 'all',                         label: 'Todas' },
  { key: 'pendiente_presupuestos',       label: 'Sin presupuestos' },
  { key: 'en_evaluacion',               label: 'En evaluación' },
  { key: 'en_votacion_comite',          label: 'En votación' },
  { key: 'pendiente_aprobacion_admin',  label: 'Pend. admin' },
  { key: 'aprobado_final',              label: 'Aprobadas' },
];

export default function BudgetApproval() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const isAdmin = isSuperAdmin(user);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState('all');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['repair-tasks'],
    queryFn: () => base44.entities.Task.filter({ task_type: 'reparacion', requires_budget: true }),
  });

  const { data: allBudgets = [] } = useQuery({
    queryKey: ['all-budgets-approval'],
    queryFn: () => base44.entities.Budget.list('-created_date', 500),
  });

  const { data: allVotes = [] } = useQuery({
    queryKey: ['all-committee-votes'],
    queryFn: () => base44.entities.CommitteeVote.list('-voted_at', 500),
  });

  const { data: communities = [] } = useQuery({
    queryKey: ['communities-list'],
    queryFn: () => base44.entities.Community.list('name', 100),
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.CommunityMember.filter({ user_email: user?.email, status: 'active' }),
    enabled: !!user?.email && !isAdmin,
  });

  // Filter tasks visible to this user
  const visibleTasks = isAdmin ? tasks : tasks.filter(t => {
    const myCommunities = myMemberships.map(m => m.community_id);
    return myCommunities.includes(t.community_id);
  });

  const flowTasks = visibleTasks.filter(t => BUDGET_FLOW_STATUSES.includes(t.status));

  const filtered = flowTasks.filter(t => {
    const matchTab = activeTab === 'all' || t.status === activeTab;
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchCommunity = communityFilter === 'all' || t.community_id === communityFilter;
    return matchTab && matchSearch && matchCommunity;
  });

  // Counts per tab
  const counts = {};
  FILTER_TABS.forEach(tab => {
    counts[tab.key] = tab.key === 'all'
      ? flowTasks.length
      : flowTasks.filter(t => t.status === tab.key).length;
  });

  // Stats cards
  const urgent = flowTasks.filter(t => t.status === 'pendiente_aprobacion_admin').length;
  const voting = flowTasks.filter(t => t.status === 'en_votacion_comite').length;
  const approved = flowTasks.filter(t => t.status === 'aprobado_final').length;
  const rejected = flowTasks.filter(t => ['rechazado_comite', 'rechazado_final'].includes(t.status)).length;

  const getCommunityName = (id) => communities.find(c => c.id === id)?.name || '—';

  const getTaskBudgets = (taskId) => allBudgets.filter(b => b.task_id === taskId);
  const getTaskVotes = (taskId) => allVotes.filter(v => v.task_id === taskId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gestión</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Aprobación de Presupuestos</h1>
          <p className="text-sm text-muted-foreground mt-1">Seguimiento del flujo de aprobación de reparaciones</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pend. aprobación admin', value: urgent, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', ring: urgent > 0 ? 'ring-1 ring-amber-200' : '' },
          { label: 'En votación comité',      value: voting,   icon: Users,          color: 'text-violet-600', bg: 'bg-violet-50', ring: '' },
          { label: 'Aprobadas final',          value: approved, icon: CheckCircle2,   color: 'text-emerald-600', bg: 'bg-emerald-50', ring: '' },
          { label: 'Rechazadas',               value: rejected, icon: XCircle,        color: 'text-red-600',     bg: 'bg-red-50', ring: '' },
        ].map(s => (
          <div key={s.label} className={cn("bg-card border border-border rounded-xl p-4 flex items-center gap-3", s.ring)}>
            <div className={cn("p-2.5 rounded-xl shrink-0", s.bg)}>
              <s.icon className={cn("h-5 w-5", s.color)} />
            </div>
            <div>
              <p className={cn("text-2xl font-extrabold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Urgent banner */}
      {urgent > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => setActiveTab('pendiente_aprobacion_admin')}
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium flex-1">
            {urgent} tarea{urgent > 1 ? 's' : ''} pendiente{urgent > 1 ? 's' : ''} de tu aprobación final
          </p>
          <ArrowRight className="h-4 w-4 text-amber-600 shrink-0" />
        </div>
      )}

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Tab filters */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 flex-wrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                activeTab === tab.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + community */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar tarea..."
              className="pl-8 h-8 text-sm bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {communities.length > 1 && (
            <select
              value={communityFilter}
              onChange={e => setCommunityFilter(e.target.value)}
              className="h-8 text-sm bg-background border border-input rounded-md px-3 text-foreground"
            >
              <option value="all">Todas las comunidades</option>
              {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {(search || communityFilter !== 'all') && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => { setSearch(''); setCommunityFilter('all'); }}>
              <X className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-20 ml-auto" />
              </div>
              <div className="h-3 bg-muted rounded w-1/4 mt-3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Sin tareas en este estado</h3>
          <p className="text-sm text-muted-foreground mt-1">No hay tareas de reparación con presupuestos activos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => {
            const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente_presupuestos;
            const taskBudgets = getTaskBudgets(task.id);
            const taskVotes = getTaskVotes(task.id);
            const approveVotes = taskVotes.filter(v => v.vote === 'approve').length;
            const rejectVotes = taskVotes.filter(v => v.vote === 'reject').length;
            const selectedBudget = taskBudgets.find(b => b.is_selected || b.id === task.committee_suggested_budget_id);
            const isUrgent = task.status === 'pendiente_aprobacion_admin';
            const isVoting = task.status === 'en_votacion_comite';
            const isApproved = task.status === 'aprobado_final';
            const isRejected = ['rechazado_comite', 'rechazado_final'].includes(task.status);

            return (
              <div
                key={task.id}
                className={cn(
                  "bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer",
                  isUrgent && "border-amber-200 ring-1 ring-amber-100",
                  isRejected && "opacity-70"
                )}
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                {/* Top row */}
                <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
                  {/* Status dot + title */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full shrink-0", cfg.dot)} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-xs text-muted-foreground">{task.community_name || getCommunityName(task.community_id)}</span>
                        {task.due_date && (
                          <>
                            <span className="text-muted-foreground/30 text-xs">·</span>
                            <span className="text-xs text-muted-foreground">
                              Fecha: {format(new Date(task.due_date), "d MMM yyyy", { locale: es })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md border shrink-0", cfg.class)}>
                    {cfg.label}
                  </span>
                </div>

                {/* Budget + vote info row */}
                <div className="px-5 pb-4 flex flex-wrap gap-4 items-center border-t border-border/50 pt-3">
                  {/* Budget count */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded-lg">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Presupuestos</p>
                      <p className="text-sm font-bold text-foreground">{taskBudgets.length}</p>
                    </div>
                  </div>

                  {/* Selected budget */}
                  {selectedBudget && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 rounded-lg">
                        <Trophy className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Propuesta seleccionada</p>
                        <p className="text-sm font-bold text-foreground">
                          {selectedBudget.supplier_name} — {formatCLP(selectedBudget.amount)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Vote results (if any) */}
                  {taskVotes.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-violet-50 rounded-lg">
                        <Users className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Votos del comité</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                            <ThumbsUp className="h-3 w-3" /> {approveVotes}
                          </span>
                          <span className="text-xs font-bold text-red-500 flex items-center gap-0.5">
                            <ThumbsDown className="h-3 w-3" /> {rejectVotes}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vote progress bar */}
                  {isVoting && taskVotes.length > 0 && (
                    <div className="flex-1 min-w-[120px] max-w-[200px]">
                      <p className="text-[10px] text-muted-foreground mb-1">Participación</p>
                      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round((approveVotes / Math.max(taskVotes.length, 1)) * 100)}%` }} />
                        <div className="h-full bg-red-400 transition-all" style={{ width: `${Math.round((rejectVotes / Math.max(taskVotes.length, 1)) * 100)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Approval info */}
                  {isApproved && task.approved_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Aprobado por</p>
                        <p className="text-xs font-semibold text-emerald-700">
                          {task.approved_by_name} · {format(new Date(task.approved_at), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Urgent action CTA */}
                  {isUrgent && (
                    <div className="ml-auto flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-amber-500 hover:bg-amber-600"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <AlertTriangle className="h-3 w-3" /> Revisar y aprobar
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Rejected reason */}
                  {isRejected && task.rejection_reason && (
                    <div className="w-full flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg mt-1">
                      <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{task.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}