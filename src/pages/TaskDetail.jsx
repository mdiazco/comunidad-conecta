import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Play, CheckCircle, AlertTriangle, Clock, User,
  Building2, Calendar, Tag, CheckCircle2, Star, Pencil, Wrench, DollarSign, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import EvidenceUpload from '@/components/evidence/EvidenceUpload';
import EvidenceList from '@/components/evidence/EvidenceList';
import ChecklistPanel from '@/components/tasks/ChecklistPanel';
import ScoreDialog from '@/components/providers/ScoreDialog';
import { isSuperAdmin, canObserveTask, canStartFinishTask } from '@/lib/permissions';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import BudgetPanel from '@/components/budgets/BudgetPanel';
import CommitteeVotingPanel from '@/components/budgets/CommitteeVotingPanel';
import ApprovalFlowPanel from '@/components/budgets/ApprovalFlowPanel';
import TaskPDFExport from '@/components/tasks/TaskPDFExport';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  creada:                      { label: 'Creada',                      class: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400',   step: 0 },
  pendiente_presupuestos:      { label: 'Pend. presupuestos',          class: 'bg-purple-50 text-purple-700 border-purple-200',    dot: 'bg-purple-500',  step: 0 },
  en_evaluacion:               { label: 'En evaluación',               class: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    step: 1 },
  en_votacion_comite:          { label: 'En votación Comité',          class: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-500',  step: 1 },
  aprobado_comite:             { label: 'Aprobado por Comité',         class: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500', step: 2 },
  rechazado_comite:            { label: 'Rechazado por Comité',        class: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',     step: -1 },
  pendiente_aprobacion_admin:  { label: 'Pend. aprobación Admin',      class: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   step: 2 },
  aprobado_final:              { label: 'Aprobado Final',              class: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', step: 3 },
  rechazado_final:             { label: 'Rechazado Final',             class: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',     step: -1 },
  asignada:                    { label: 'Asignada',                    class: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    step: 1 },
  en_ejecucion:                { label: 'En ejecución',                class: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   step: 2 },
  finalizada:                  { label: 'Finalizada',                  class: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', step: 3 },
  observada:                   { label: 'Observada',                   class: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500',     step: -1 },
};

const PRIORITY_MAP = {
  alta:  { label: 'Alta',  class: 'bg-red-50 text-red-700 border-red-200' },
  media: { label: 'Media', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  baja:  { label: 'Baja',  class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const WORKFLOW = [
  { key: 'creada',       label: 'Creada',       icon: Tag },
  { key: 'asignada',     label: 'Asignada',     icon: User },
  { key: 'en_ejecucion', label: 'En ejecución', icon: Play },
  { key: 'finalizada',   label: 'Finalizada',   icon: CheckCircle2 },
];

// States that belong to the budget/committee flow
const BUDGET_FLOW_STATUSES = [
  'pendiente_presupuestos', 'en_evaluacion',
  'en_votacion_comite', 'aprobado_comite', 'rechazado_comite',
  'pendiente_aprobacion_admin', 'aprobado_final', 'rechazado_final',
];

export default function TaskDetail() {
  const { user } = useOutletContext();
  const taskId = window.location.pathname.split('/tasks/')[1];
  const [observationNote, setObservationNote] = useState('');
  const [localProgress, setLocalProgress] = useState(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const list = await base44.entities.Task.filter({ id: taskId });
      return list[0];
    },
    enabled: !!taskId,
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.CommunityMember.filter({ user_email: user?.email, status: 'active' }),
    enabled: !!user?.email,
  });

  const { data: communityData = [] } = useQuery({
    queryKey: ['community', task?.community_id],
    queryFn: () => base44.entities.Community.filter({ id: task?.community_id }),
    enabled: !!task?.community_id,
  });

  const communityConfig = communityData[0] || {};
  const communityRole = myMemberships.find(m => m.community_id === task?.community_id)?.role;
  const isAdmin = isSuperAdmin(user);
  const canModifyStatus = canStartFinishTask(user?.role, communityRole, task?.assigned_to, user?.email);
  const canObserve = canObserveTask(communityRole);

  const statusMutation = useMutation({
    mutationFn: ({ newStatus, extra }) => base44.entities.Task.update(taskId, { status: newStatus, ...extra }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Estado actualizado');
    },
  });

  const handleStartTask   = () => statusMutation.mutate({ newStatus: 'en_ejecucion', extra: { started_at: new Date().toISOString() } });
  const handleFinishTask  = () => statusMutation.mutate({ newStatus: 'finalizada', extra: { finished_at: new Date().toISOString(), progress: 100 } });
  const handleObserve     = () => { statusMutation.mutate({ newStatus: 'observada', extra: { observation_note: observationNote } }); setObservationNote(''); };

  const progressMutation = useMutation({
    mutationFn: (pct) => base44.entities.Task.update(taskId, { progress: pct }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleProgressChange = (delta) => {
    const current = localProgress !== null ? localProgress : (task?.progress ?? 0);
    const next = Math.min(100, Math.max(0, current + delta));
    setLocalProgress(next);
  };

  const handleProgressSave = () => {
    if (localProgress !== null) {
      progressMutation.mutate(localProgress);
      setLocalProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Tarea no encontrada</p>
        <Link to="/tasks"><Button variant="outline" className="mt-4">Volver</Button></Link>
      </div>
    );
  }

  const status = STATUS_MAP[task.status] || STATUS_MAP.creada;
  const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.media;
  const currentStep = status.step;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['finalizada', 'observada'].includes(task.status);
  const isObserved = task.status === 'observada';
  const isFinished = task.status === 'finalizada';
  const isBudgetFlow = BUDGET_FLOW_STATUSES.includes(task.status);

  const hasChecklist = (task.checklist_items?.length ?? 0) > 0;
  const checklistPct = hasChecklist
    ? Math.round((task.checklist_items.filter(i => i.completed).length / task.checklist_items.length) * 100)
    : null;

  const progressPct = isFinished ? 100 : (localProgress !== null ? localProgress : (task.progress ?? 0));
  const displayedProgress = isFinished ? 100 : (hasChecklist ? checklistPct : progressPct);
  const isDirty = !hasChecklist && localProgress !== null && localProgress !== (task.progress ?? 0);
  const canFinish = !hasChecklist || checklistPct === 100;

  // Show committee voting panel for reparacion tasks requiring budget — always visible in the flow
  const isCommitteeMemberOfTask = myMemberships.some(
    m => m.community_id === task?.community_id && m.role === 'comite' && m.status === 'active'
  );
  const showApprovalFlow = task.task_type === 'reparacion' && task.requires_budget &&
    ['en_evaluacion', 'pendiente_aprobacion_comite', 'en_votacion_comite', 'aprobado_comite',
     'rechazado_comite', 'pendiente_aprobacion_admin', 'aprobado_final', 'rechazado_final'].includes(task.status);

  const showCommitteePanel = task.task_type === 'reparacion' && task.requires_budget &&
    (isAdmin || isCommitteeMemberOfTask) &&
    ['pendiente_aprobacion_comite', 'en_votacion_comite', 'aprobado_comite', 'rechazado_comite',
     'pendiente_aprobacion_admin', 'aprobado_final', 'rechazado_final'].includes(task.status);

  return (
    <div className="space-y-5 max-w-4xl animate-in fade-in duration-300">

      {/* ── Back + Title ── */}
      <div className="flex items-start gap-3">
        <Link to="/tasks">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md border", status.class)}>
                {status.label}
              </span>
              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md border", priority.class)}>
                {priority.label}
              </span>
              {task.task_type === 'reparacion' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md border bg-violet-50 text-violet-700 border-violet-200 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Reparación
                </span>
              )}
              {isOverdue && (
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Vencida
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TaskPDFExport task={task} />
              {(isAdmin || canModifyStatus) && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">{task.title}</h1>
          {task.community_name && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> {task.community_name}
            </p>
          )}
        </div>
      </div>

      {/* ── Progress / Workflow ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">% de Avance</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-bold tabular-nums",
                displayedProgress === 100 ? "text-emerald-600" : isObserved ? "text-red-500" : "text-primary"
              )}>
                {displayedProgress}%
              </span>
              {displayedProgress === 100 && !isObserved && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Completado</span>
              )}
            </div>
          </div>

          <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isObserved ? "bg-red-500" : displayedProgress === 100 ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${displayedProgress}%` }}
            />
          </div>

          {!isFinished && !isObserved && canModifyStatus && !hasChecklist && !isBudgetFlow && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[10, 25, 50].map(step => (
                  <button
                    key={`-${step}`}
                    onClick={() => handleProgressChange(-step)}
                    disabled={displayedProgress <= 0}
                    className="px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted transition-colors disabled:opacity-30"
                  >-{step}</button>
                ))}
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={displayedProgress}
                onChange={e => setLocalProgress(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <div className="flex items-center gap-1">
                {[10, 25, 50].map(step => (
                  <button
                    key={`+${step}`}
                    onClick={() => handleProgressChange(step)}
                    disabled={displayedProgress >= 100}
                    className="px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted transition-colors disabled:opacity-30"
                  >+{step}</button>
                ))}
              </div>
              {isDirty && (
                <Button size="sm" onClick={handleProgressSave} disabled={progressMutation.isPending} className="text-xs h-7 px-3">
                  Guardar
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex items-center pt-2 border-t border-border">
          {WORKFLOW.map((step, i) => {
            const done    = !isObserved && currentStep > i;
            const current = !isObserved && currentStep === i;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all",
                    done    ? "bg-primary border-primary text-white" :
                    current ? "bg-primary/10 border-primary text-primary" :
                              "bg-muted border-border text-muted-foreground"
                  )}>
                    <step.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium text-center leading-tight hidden sm:block",
                    done || current ? "text-foreground" : "text-muted-foreground"
                  )}>{step.label}</span>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <div className={cn("h-0.5 flex-1 -mt-4 mx-1 transition-colors", done ? "bg-primary" : "bg-border")} />
                )}
              </React.Fragment>
            );
          })}
          {isObserved && (
            <>
              <div className="h-0.5 w-8 bg-red-300 mx-1 -mt-4" />
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-8 w-8 rounded-full flex items-center justify-center border-2 bg-red-50 border-red-400 text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-medium text-red-600 hidden sm:block">Observada</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap gap-3">
        {(task.status === 'finalizada' || task.status === 'observada') && canObserve && (
          <Button variant="outline" onClick={() => setScoreOpen(true)} className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
            <Star className="h-4 w-4" /> Evaluar Proveedor
          </Button>
        )}
        {task.status === 'asignada' && canModifyStatus && (
          <Button onClick={handleStartTask} disabled={statusMutation.isPending} className="gap-2">
            <Play className="h-4 w-4" /> Iniciar Tarea
          </Button>
        )}
        {task.status === 'en_ejecucion' && canModifyStatus && (
          <div className="flex flex-col gap-1">
            <Button
              onClick={handleFinishTask}
              disabled={statusMutation.isPending || !canFinish}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" /> Finalizar Tarea
            </Button>
            {hasChecklist && !canFinish && (
              <p className="text-xs text-amber-600 text-center">
                Completa el 100% del checklist para finalizar ({checklistPct}% completado)
              </p>
            )}
          </div>
        )}
        {task.status === 'finalizada' && canObserve && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full">
            <Textarea
              placeholder="Describe el motivo de la observación..."
              value={observationNote}
              onChange={e => setObservationNote(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button
              variant="destructive"
              onClick={handleObserve}
              disabled={statusMutation.isPending || !observationNote}
              className="gap-2 shrink-0"
            >
              <AlertTriangle className="h-4 w-4" /> Marcar como Observada
            </Button>
          </div>
        )}
      </div>

      {/* ── Observation note ── */}
      {task.observation_note && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Observación del Comité</p>
            <p className="text-sm text-red-800 mt-0.5">{task.observation_note}</p>
          </div>
        </div>
      )}

      <ScoreDialog open={scoreOpen} onOpenChange={setScoreOpen} task={task} user={user} />
      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task} />

      {/* ── Approval Flow (visual stepper) ── */}
      {showApprovalFlow && (
        <ApprovalFlowPanel task={task} />
      )}

      {/* ── Budget Panel (for reparacion tasks) ── */}
      {task.task_type === 'reparacion' && task.requires_budget && (
        <BudgetPanel task={task} canApprove={isAdmin || canObserve} user={user} />
      )}

      {/* ── Committee Voting Panel ── */}
      {showCommitteePanel && (
        <CommitteeVotingPanel
          task={task}
          user={user}
          communityConfig={communityConfig}
          onVoteComplete={() => queryClient.invalidateQueries({ queryKey: ['task', taskId] })}
        />
      )}

      {/* ── Checklist ── */}
      {(task.checklist_items?.length > 0) && (
        <ChecklistPanel task={task} canEdit={(canModifyStatus || isAdmin) && !['finalizada', 'observada', 'cerrada_fin_año'].includes(task.status)} />
      )}

      {/* ── Details + Evidence ── */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
                <p className="text-sm text-foreground">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-sm font-medium capitalize">{task.task_type}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Prioridad</p>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md border", priority.class)}>
                    {priority.label}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha comprometida</p>
                  <p className={cn("text-sm font-medium", isOverdue ? "text-red-600" : "text-foreground")}>
                    {task.due_date ? format(new Date(task.due_date), "d 'de' MMMM yyyy", { locale: es }) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Responsable Interno</p>
                  <p className="text-sm font-medium">{task.assigned_to_name || task.assigned_to || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Proveedor / Contratista</p>
                  <p className="text-sm font-medium">{task.supplier_name || task.provider_name || '—'}</p>
                </div>
              </div>
              {task.committee_votes_approve > 0 || task.committee_votes_reject > 0 ? (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Votos Comité</p>
                    <p className="text-sm font-medium">
                      <span className="text-emerald-600">{task.committee_votes_approve} ✓</span>
                      {' / '}
                      <span className="text-red-500">{task.committee_votes_reject} ✗</span>
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Timestamps */}
            <div className="pt-3 border-t border-border space-y-1.5">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Creada</span>
                <span className="text-xs font-medium">{format(new Date(task.created_date), "d MMM yyyy", { locale: es })}</span>
              </div>
              {task.committee_sent_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Enviada a comité</span>
                  <span className="text-xs font-medium">{format(new Date(task.committee_sent_at), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}
              {task.committee_approved_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Aprobada por comité</span>
                  <span className="text-xs font-medium text-emerald-600">{format(new Date(task.committee_approved_at), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}
              {task.started_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Iniciada</span>
                  <span className="text-xs font-medium">{format(new Date(task.started_at), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}
              {task.finished_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Finalizada</span>
                  <span className="text-xs font-medium text-emerald-600">{format(new Date(task.finished_at), "d MMM yyyy", { locale: es })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <EvidenceUpload taskId={taskId} communityId={task.community_id} userName={user?.full_name || user?.email} />
          <EvidenceList taskId={taskId} />
        </div>
      </div>
    </div>
  );
}