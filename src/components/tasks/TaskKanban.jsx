import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Only show budget approval flow columns — these are the relevant states
const COLUMNS = [
  { key: 'pendiente_presupuestos',     label: 'Pend. Presupuestos',  color: 'bg-purple-500',  light: 'bg-purple-50 border-purple-200',  text: 'text-purple-700' },
  { key: 'en_evaluacion',              label: 'En Evaluación',       color: 'bg-blue-500',    light: 'bg-blue-50 border-blue-200',      text: 'text-blue-700' },
  { key: 'en_votacion_comite',         label: 'Votación Comité',     color: 'bg-violet-500',  light: 'bg-violet-50 border-violet-200',  text: 'text-violet-700' },
  { key: 'pendiente_aprobacion_admin', label: 'Pend. Admin',         color: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200',    text: 'text-amber-700' },
  { key: 'asignada',                   label: 'Aprobada / Asignada', color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  { key: 'rechazado_comite',           label: 'Rechazado Comité',    color: 'bg-red-400',     light: 'bg-red-50 border-red-200',        text: 'text-red-700' },
];

// Allowed transitions when dragging (to prevent invalid moves)
const ALLOWED_TRANSITIONS = {
  pendiente_presupuestos:     ['en_evaluacion'],
  en_evaluacion:              ['pendiente_aprobacion_comite', 'en_votacion_comite', 'pendiente_aprobacion_admin'],
  en_votacion_comite:         ['pendiente_aprobacion_admin', 'rechazado_comite'],
  pendiente_aprobacion_admin: ['asignada', 'rechazado_comite', 'en_evaluacion'],
  rechazado_comite:           ['en_evaluacion'],
};

const PRIORITY_DOT = {
  alta:  'bg-red-500',
  media: 'bg-amber-400',
  baja:  'bg-emerald-500',
};

function TaskCard({ task, index, isOverdue, isUpcoming }) {
  const navigate = useNavigate();
  const pct = task.status === 'finalizada' ? 100 : (task.progress ?? 0);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "bg-card border border-border rounded-xl p-3 space-y-2.5 cursor-grab active:cursor-grabbing select-none transition-shadow",
            snapshot.isDragging && "shadow-xl ring-2 ring-primary/30 rotate-1"
          )}
        >
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[task.priority] || 'bg-slate-400')} />
              <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{task.title}</p>
            </div>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); navigate(`/tasks/${task.id}`); }}
              className="shrink-0 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              <Eye className="h-3 w-3" />
            </button>
          </div>

          {/* Community */}
          {task.community_name && (
            <p className="text-[10px] text-muted-foreground truncate">{task.community_name}</p>
          )}

          {/* Budget amount if present */}
          {task.selected_budget_amount > 0 && (
            <p className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(task.selected_budget_amount)}
            </p>
          )}

          {/* Footer: due date + progress */}
          <div className="flex items-center justify-between gap-2">
            {task.due_date ? (
              <span className={cn(
                "text-[10px] font-medium flex items-center gap-1",
                isOverdue ? "text-red-600" : isUpcoming ? "text-amber-600" : "text-muted-foreground"
              )}>
                {isOverdue && <AlertTriangle className="h-2.5 w-2.5" />}
                {isUpcoming && !isOverdue && <Clock className="h-2.5 w-2.5" />}
                {format(new Date(task.due_date), "d MMM", { locale: es })}
              </span>
            ) : <span />}
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-primary/60")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground tabular-nums">{pct}%</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function TaskKanban({ tasks }) {
  const queryClient = useQueryClient();
  const now = new Date();

  const isOverdueFn = t => t.due_date && new Date(t.due_date) < now && !['finalizada', 'observada'].includes(t.status);
  const isUpcomingFn = t => {
    if (!t.due_date || ['finalizada', 'observada'].includes(t.status)) return false;
    const d = new Date(t.due_date);
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return d >= now && d <= threeDays;
  };

  // Only tasks with requires_budget for the kanban (budget approval flow)
  const kanbanTasks = tasks.filter(t => t.requires_budget || COLUMNS.some(c => c.key === t.status));

  const statusMutation = useMutation({
    mutationFn: ({ taskId, newStatus }) => base44.entities.Task.update(taskId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    const allowed = ALLOWED_TRANSITIONS[source.droppableId] || [];
    if (!allowed.includes(newStatus)) {
      toast.error('Transición no permitida en este flujo de aprobación');
      return;
    }

    statusMutation.mutate({ taskId: draggableId, newStatus });
    toast.success(`Tarea movida a "${COLUMNS.find(c => c.key === newStatus)?.label}"`);
  };

  const getColumnTasks = (key) => kanbanTasks.filter(t => t.status === key);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {COLUMNS.map(col => {
          const colTasks = getColumnTasks(col.key);
          return (
            <div key={col.key} className="flex flex-col shrink-0 w-64">
              {/* Column header */}
              <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl border mb-3", col.light)}>
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", col.color)} />
                  <span className={cn("text-xs font-bold", col.text)}>{col.label}</span>
                </div>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums",
                  col.text, col.light
                )}>
                  {colTasks.length}
                </span>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 space-y-2.5 p-2 rounded-xl border-2 border-dashed min-h-[120px] transition-colors",
                      snapshot.isDraggingOver
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/40 bg-muted/20"
                    )}
                  >
                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-[10px] text-muted-foreground/40 text-center pt-6">Sin tareas</p>
                    )}
                    {colTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        isOverdue={isOverdueFn(task)}
                        isUpcoming={isUpcomingFn(task)}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}