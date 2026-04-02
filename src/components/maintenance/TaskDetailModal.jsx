import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Play, CheckCircle, AlertTriangle, User, Building2, Calendar, Tag,
  CheckCircle2, Star, Pencil, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ChecklistPanel from '@/components/tasks/ChecklistPanel';
import EvidenceUpload from '@/components/evidence/EvidenceUpload';
import EvidenceList from '@/components/evidence/EvidenceList';
import ScoreDialog from '@/components/providers/ScoreDialog';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import { isSuperAdmin, canObserveTask, canStartFinishTask } from '@/lib/permissions';

const STATUS_MAP = {
  creada:       { label: 'Creada',       class: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400',   step: 0 },
  asignada:     { label: 'Asignada',     class: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500',    step: 1 },
  en_ejecucion: { label: 'En ejecución', class: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-500',   step: 2 },
  finalizada:   { label: 'Finalizada',   class: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500', step: 3 },
  observada:    { label: 'Observada',    class: 'bg-red-50 text-red-700 border-red-200',              dot: 'bg-red-500',     step: -1 },
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

export default function TaskDetailModal({ taskId, open, onOpenChange, user }) {
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
    enabled: !!taskId && open,
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.CommunityMember.filter({ user_email: user?.email, status: 'active' }),
    enabled: !!user?.email,
  });

  const communityRole = myMemberships.find(m => m.community_id === task?.community_id)?.role;
  const isAdmin = isSuperAdmin(user);
  const canModifyStatus = canStartFinishTask(user?.role, communityRole, task?.assigned_to, user?.email);
  const canObserve = canObserveTask(communityRole);

  const statusMutation = useMutation({
    mutationFn: ({ newStatus, extra }) => base44.entities.Task.update(taskId, { status: newStatus, ...extra }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_tasks'] });
      toast.success('Estado actualizado');
    },
  });

  const progressMutation = useMutation({
    mutationFn: (pct) => base44.entities.Task.update(taskId, { progress: pct }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
  });

  const handleStartTask  = () => statusMutation.mutate({ newStatus: 'en_ejecucion', extra: { started_at: new Date().toISOString() } });
  const handleFinishTask = () => statusMutation.mutate({ newStatus: 'finalizada', extra: { finished_at: new Date().toISOString(), progress: 100 } });
  const handleObserve    = () => { statusMutation.mutate({ newStatus: 'observada', extra: { observation_note: observationNote } }); setObservationNote(''); };

  const handleProgressSave = () => {
    if (localProgress !== null) { progressMutation.mutate(localProgress); setLocalProgress(null); }
  };

  if (!open) return null;

  const status   = task ? (STATUS_MAP[task.status]   || STATUS_MAP.creada)   : null;
  const priority = task ? (PRIORITY_MAP[task.priority] || PRIORITY_MAP.media) : null;
  const isOverdue  = task?.due_date && new Date(task.due_date) < new Date() && !['finalizada', 'observada'].includes(task?.status);
  const isObserved = task?.status === 'observada';
  const isFinished = task?.status === 'finalizada';
  const hasChecklist = (task?.checklist_items?.length ?? 0) > 0;
  const checklistPct = hasChecklist ? Math.round((task.checklist_items.filter(i => i.completed).length / task.checklist_items.length) * 100) : null;
  const progressPct = isFinished ? 100 : (localProgress !== null ? localProgress : (task?.progress ?? 0));
  const displayedProgress = isFinished ? 100 : (hasChecklist ? checklistPct : progressPct);
  const isDirty = !hasChecklist && localProgress !== null && localProgress !== (task?.progress ?? 0);
  const canFinish = !hasChecklist || checklistPct === 100;
  const currentStep = status?.step ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isLoading ? 'Cargando...' : task?.title || 'Detalle de Tarea'}
            </DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && task && (
            <div className="space-y-5">

              {/* Badges + Edit */}
              <div className="flex items-center gap-2 flex-wrap justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md border", status.class)}>{status.label}</span>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-md border", priority.class)}>{priority.label}</span>
                  {isOverdue && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Vencida
                    </span>
                  )}
                </div>
                {(isAdmin || canModifyStatus) && (
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>

              {task.community_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> {task.community_name}
                </p>
              )}

              {/* Progress + workflow */}
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">% de Avance</p>
                    <span className={cn("text-2xl font-bold tabular-nums", displayedProgress === 100 ? "text-emerald-600" : isObserved ? "text-red-500" : "text-primary")}>
                      {displayedProgress}%
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500",
                        isObserved ? "bg-red-500" : displayedProgress === 100 ? "bg-emerald-500" : "bg-primary"
                      )}
                      style={{ width: `${displayedProgress}%` }}
                    />
                  </div>
                  {!isFinished && !isObserved && canModifyStatus && !hasChecklist && (
                    <div className="flex items-center gap-2">
                      <input type="range" min={0} max={100} step={5} value={displayedProgress}
                        onChange={e => setLocalProgress(Number(e.target.value))}
                        className="flex-1 accent-primary" />
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
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className={cn("h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all",
                            done    ? "bg-primary border-primary text-white" :
                            current ? "bg-primary/10 border-primary text-primary" :
                                      "bg-muted border-border text-muted-foreground"
                          )}>
                            <step.icon className="h-3 w-3" />
                          </div>
                          <span className={cn("text-[10px] font-medium text-center hidden sm:block",
                            done || current ? "text-foreground" : "text-muted-foreground"
                          )}>{step.label}</span>
                        </div>
                        {i < WORKFLOW.length - 1 && (
                          <div className={cn("h-0.5 flex-1 -mt-4 mx-1 transition-colors", done ? "bg-primary" : "bg-border")} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
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
                    <Button onClick={handleFinishTask} disabled={statusMutation.isPending || !canFinish}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="h-4 w-4" /> Finalizar Tarea
                    </Button>
                    {hasChecklist && !canFinish && (
                      <p className="text-xs text-amber-600 text-center">Completa el 100% del checklist ({checklistPct}%)</p>
                    )}
                  </div>
                )}
                {task.status === 'finalizada' && canObserve && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full">
                    <Textarea placeholder="Motivo de la observación..." value={observationNote}
                      onChange={e => setObservationNote(e.target.value)} rows={2} className="flex-1" />
                    <Button variant="destructive" onClick={handleObserve}
                      disabled={statusMutation.isPending || !observationNote} className="gap-2 shrink-0">
                      <AlertTriangle className="h-4 w-4" /> Marcar Observada
                    </Button>
                  </div>
                )}
              </div>

              {/* Observation note */}
              {task.observation_note && (
                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Observación del Comité</p>
                    <p className="text-sm text-red-800 mt-0.5">{task.observation_note}</p>
                  </div>
                </div>
              )}

              {/* Checklist */}
              {hasChecklist && (
                <ChecklistPanel task={task} canEdit={(canModifyStatus || isAdmin) && !['finalizada', 'observada', 'cerrada_fin_año'].includes(task.status)} />
              )}

              {/* Details */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Detalles</p>
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { Icon: Calendar, label: 'Fecha comprometida', value: task.due_date ? format(new Date(task.due_date), "d MMM yyyy", { locale: es }) : '—' },
                    { Icon: User,     label: 'Responsable',        value: task.assigned_to_name || '—' },
                    { Icon: Wrench,   label: 'Proveedor',          value: task.provider_name || task.supplier_name || '—' },
                  ].map(({ Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence */}
              <div className="space-y-4">
                <EvidenceUpload taskId={taskId} communityId={task.community_id} userName={user?.full_name || user?.email} />
                <EvidenceList taskId={taskId} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {task && <ScoreDialog open={scoreOpen} onOpenChange={setScoreOpen} task={task} user={user} />}
      {task && <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task} />}
    </>
  );
}