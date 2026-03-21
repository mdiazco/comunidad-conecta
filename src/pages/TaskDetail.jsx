import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Play, CheckCircle, AlertTriangle, Upload, Clock, User, Building2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import EvidenceUpload from '@/components/evidence/EvidenceUpload';
import EvidenceList from '@/components/evidence/EvidenceList';
import { isSuperAdmin, canObserveTask, canStartFinishTask } from '@/lib/permissions';

const STATUS_MAP = {
  creada: { label: 'Creada', class: 'bg-muted text-muted-foreground' },
  asignada: { label: 'Asignada', class: 'bg-primary/10 text-primary' },
  en_ejecucion: { label: 'En ejecución', class: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', class: 'bg-emerald-100 text-emerald-700' },
  observada: { label: 'Observada', class: 'bg-red-100 text-red-700' },
};

const WORKFLOW_STEPS = ['creada', 'asignada', 'en_ejecucion', 'finalizada'];

export default function TaskDetail() {
  const { user } = useOutletContext();
  const taskId = window.location.pathname.split('/tasks/')[1];
  const [observationNote, setObservationNote] = useState('');
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

  const communityRole = myMemberships.find(m => m.community_id === task?.community_id)?.role;
  const isAdmin = isSuperAdmin(user);
  const canModifyStatus = canStartFinishTask(user?.role, communityRole, task?.assigned_to, user?.email);
  const canObserve = canObserveTask(communityRole);

  const statusMutation = useMutation({
    mutationFn: ({ newStatus, extra }) => base44.entities.Task.update(taskId, {
      status: newStatus,
      ...extra,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Estado actualizado');
    },
  });

  const handleStartTask = () => {
    statusMutation.mutate({ newStatus: 'en_ejecucion', extra: { started_at: new Date().toISOString() } });
  };

  const handleFinishTask = () => {
    statusMutation.mutate({ newStatus: 'finalizada', extra: { finished_at: new Date().toISOString() } });
  };

  const handleObserve = () => {
    statusMutation.mutate({ newStatus: 'observada', extra: { observation_note: observationNote } });
    setObservationNote('');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>;
  }

  if (!task) {
    return <div className="text-center py-20">
      <p className="text-muted-foreground">Tarea no encontrada</p>
      <Link to="/tasks"><Button variant="outline" className="mt-4">Volver</Button></Link>
    </div>;
  }

  const status = STATUS_MAP[task.status] || STATUS_MAP.creada;
  const currentStepIndex = WORKFLOW_STEPS.indexOf(task.status);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['finalizada','observada'].includes(task.status);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/tasks"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={status.class} variant="secondary">{status.label}</Badge>
            {isOverdue && <Badge className="bg-red-100 text-red-700">Vencida</Badge>}
          </div>
        </div>
      </div>

      {/* Workflow progress */}
      <Card className="p-4">
        <p className="text-sm font-medium mb-3">Flujo de trabajo</p>
        <div className="flex items-center gap-1">
          {WORKFLOW_STEPS.map((step, i) => {
            const isCompleted = i <= currentStepIndex && task.status !== 'observada';
            const isCurrent = step === task.status;
            const stepLabels = { creada: 'Creada', asignada: 'Asignada', en_ejecucion: 'En ejecución', finalizada: 'Finalizada' };
            return (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isCurrent ? 'bg-primary text-primary-foreground' : isCompleted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {stepLabels[step]}
                </div>
                {i < WORKFLOW_STEPS.length - 1 && <div className={`h-0.5 w-6 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />}
              </React.Fragment>
            );
          })}
          {task.status === 'observada' && (
            <>
              <div className="h-0.5 w-6 bg-red-300" />
              <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Observada</div>
            </>
          )}
        </div>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {task.status === 'asignada' && canModifyStatus && (
          <Button onClick={handleStartTask} disabled={statusMutation.isPending}>
            <Play className="h-4 w-4 mr-2" /> Iniciar Tarea
          </Button>
        )}
        {task.status === 'en_ejecucion' && canModifyStatus && (
          <Button onClick={handleFinishTask} disabled={statusMutation.isPending}>
            <CheckCircle className="h-4 w-4 mr-2" /> Finalizar Tarea
          </Button>
        )}
        {task.status === 'finalizada' && canObserve && (
          <div className="flex items-end gap-3 w-full">
            <div className="flex-1">
              <Textarea
                placeholder="Nota de observación..."
                value={observationNote}
                onChange={e => setObservationNote(e.target.value)}
                rows={2}
              />
            </div>
            <Button variant="destructive" onClick={handleObserve} disabled={statusMutation.isPending || !observationNote}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Marcar como Observada
            </Button>
          </div>
        )}
      </div>

      {/* Task info */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {task.description && <div><p className="text-xs text-muted-foreground">Descripción</p><p className="text-sm">{task.description}</p></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">Tipo</p><p className="text-sm capitalize">{task.task_type}</p></div>
              <div><p className="text-xs text-muted-foreground">Prioridad</p><p className="text-sm capitalize">{task.priority}</p></div>
              <div><p className="text-xs text-muted-foreground">Comunidad</p><p className="text-sm">{task.community_name || '-'}</p></div>
              <div><p className="text-xs text-muted-foreground">Fecha comprometida</p><p className="text-sm">{task.due_date ? format(new Date(task.due_date), "d MMM yyyy", { locale: es }) : '-'}</p></div>
            </div>
            {task.assigned_to && (
              <div><p className="text-xs text-muted-foreground">Responsable</p><p className="text-sm">{task.assigned_to_name || task.assigned_to}</p></div>
            )}
            {task.observation_note && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-medium text-red-700">Observación del Comité</p>
                <p className="text-sm text-red-800 mt-1">{task.observation_note}</p>
              </div>
            )}
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