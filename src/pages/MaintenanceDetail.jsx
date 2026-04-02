import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Wrench, CalendarClock, User, Repeat, Zap, Pencil,
  Clock, AlertTriangle, ListChecks, BarChart2, CheckCircle2, XCircle, Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import MaintenanceFormDialog from '@/components/maintenance/MaintenanceFormDialog';
import GenerateTaskDialog from '@/components/maintenance/GenerateTaskDialog';
import TaskDetailModal from '@/components/maintenance/TaskDetailModal';
import { useOutletContext } from 'react-router-dom';

const FREQ_LABELS = {
  mensual: 'Mensual', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual', personalizada: 'Personalizada',
};

const STATUS_STYLES = {
  creada:       { label: 'Creada',       dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 border-slate-200' },
  asignada:     { label: 'Asignada',     dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_ejecucion: { label: 'En ejecución', dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  finalizada:   { label: 'Finalizada',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  observada:    { label: 'Observada',    dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200' },
};

function ChecklistMiniSummary({ items = [] }) {
  if (!items.length) return <span className="text-xs text-muted-foreground/40">Sin checklist</span>;
  const done = items.filter(i => i.completed).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden w-16">
        <div className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{done}/{items.length}</span>
    </div>
  );
}

export default function MaintenanceDetail() {
  const { id } = useParams();
  const { user } = useOutletContext();
  const [editOpen, setEditOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const { data: maintenance, isLoading } = useQuery({
    queryKey: ['maintenances', id],
    queryFn: () => base44.entities.Maintenance.filter({ id }),
    select: r => r[0],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['maintenance_tasks', id],
    queryFn: () => base44.entities.Task.filter({ procedure_id: id }),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!maintenance) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Mantención no encontrada</p>
      <Link to="/maintenances"><Button variant="outline" className="mt-4">Volver</Button></Link>
    </div>
  );

  const days = maintenance.next_execution
    ? differenceInDays(new Date(maintenance.next_execution), new Date())
    : null;
  const isOverdue = days !== null && days < 0 && maintenance.active;
  const isSoon    = days !== null && days >= 0 && days <= 7 && maintenance.active;

  // Compliance stats
  const sortedTasks = [...tasks].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const finalized = tasks.filter(t => t.status === 'finalizada').length;
  const observed  = tasks.filter(t => t.status === 'observada').length;
  const compliancePct = tasks.length > 0 ? Math.round((finalized / tasks.length) * 100) : 0;

  const checklist = maintenance.checklist_items || [];

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-4xl">

      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Link to="/maintenances" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Mantenciones
        </Link>
        <div className="flex gap-2">
          {maintenance.active && (
            <Button onClick={() => setGenerateOpen(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
              <Zap className="h-4 w-4" /> Generar Tarea
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
            maintenance.type === 'preventiva' ? 'bg-blue-100' : 'bg-amber-100'
          )}>
            <Wrench className={cn("h-6 w-6", maintenance.type === 'preventiva' ? 'text-blue-600' : 'text-amber-600')} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-foreground">{maintenance.name}</h1>
              {!maintenance.active && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md border bg-slate-50 text-slate-500 border-slate-200">Inactiva</span>
              )}
              {isOverdue && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md border bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Vencida
                </span>
              )}
              {isSoon && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Próxima
                </span>
              )}
            </div>
            {maintenance.description && (
              <p className="text-sm text-muted-foreground">{maintenance.description}</p>
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
          {[
            { Icon: Wrench,        label: 'Tipo',            value: maintenance.type === 'preventiva' ? 'Preventiva' : 'Correctiva' },
            { Icon: Repeat,        label: 'Frecuencia',      value: FREQ_LABELS[maintenance.frequency] },
            { Icon: CalendarClock, label: 'Próx. ejecución', value: maintenance.next_execution ? format(new Date(maintenance.next_execution), "d MMM yyyy", { locale: es }) : '—' },
            { Icon: User,          label: 'Responsable',     value: maintenance.assigned_to_name || 'Sin asignar' },
          ].map(({ Icon, label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium text-foreground truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist preview */}
      {checklist.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Checklist configurado</h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{checklist.length} pasos</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklist.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-primary/60 w-5 shrink-0">{idx + 1}.</span>
                <span className="truncate">{item.title}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-3">Este checklist se copiará automáticamente en cada tarea generada.</p>
        </div>
      )}

      {/* Compliance dashboard */}
      {tasks.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Dashboard de Cumplimiento</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Tareas generadas', value: tasks.length,    color: 'text-foreground',     bg: 'bg-muted/40' },
              { label: 'Finalizadas',       value: finalized,       color: 'text-emerald-600',    bg: 'bg-emerald-50' },
              { label: 'Observadas',        value: observed,        color: 'text-red-600',        bg: 'bg-red-50' },
              { label: 'Cumplimiento',      value: `${compliancePct}%`, color: compliancePct === 100 ? 'text-emerald-600' : compliancePct >= 70 ? 'text-primary' : 'text-amber-600', bg: 'bg-muted/40' },
            ].map(s => (
              <div key={s.label} className={cn("rounded-lg p-3", s.bg)}>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Compliance bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Tasa de cumplimiento</span>
              <span className="text-xs font-bold text-foreground">{compliancePct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", compliancePct === 100 ? "bg-emerald-500" : compliancePct >= 70 ? "bg-primary" : "bg-amber-500")}
                style={{ width: `${compliancePct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Task history */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Historial de Ejecuciones</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''} generada{tasks.length !== 1 ? 's' : ''}</p>
          </div>
          {maintenance.active && (
            <Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)} className="gap-1.5 text-xs h-7">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Generar
            </Button>
          )}
        </div>

        {sortedTasks.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No hay tareas generadas aún.</p>
            {maintenance.active && (
              <Button onClick={() => setGenerateOpen(true)} variant="outline" className="mt-3 gap-2 text-xs">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Generar primera tarea
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedTasks.map(task => {
              const st = STATUS_STYLES[task.status] || STATUS_STYLES.creada;
              const taskChecklist = task.checklist_items || [];
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-accent/40 transition-colors group text-left"
                >
                  <span className={cn("h-2 w-2 rounded-full shrink-0", st.dot)} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Creada {format(new Date(task.created_date), "d MMM yyyy", { locale: es })}
                      {task.due_date && ` · Fecha: ${format(new Date(task.due_date), "d MMM yyyy", { locale: es })}`}
                    </p>
                  </div>
                  {taskChecklist.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0 w-28">
                      <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <ChecklistMiniSummary items={taskChecklist} />
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border", st.badge)}>{st.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <MaintenanceFormDialog open={editOpen} onOpenChange={setEditOpen} maintenance={maintenance} />
      <GenerateTaskDialog open={generateOpen} onOpenChange={setGenerateOpen} maintenance={maintenance} />
      <TaskDetailModal
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={v => { if (!v) setSelectedTaskId(null); }}
        user={user}
      />
    </div>
  );
}