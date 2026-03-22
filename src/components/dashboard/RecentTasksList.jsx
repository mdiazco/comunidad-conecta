import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUpRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  creada:       { label: 'Creada',       dot: 'bg-slate-400' },
  asignada:     { label: 'Asignada',     dot: 'bg-blue-500' },
  en_ejecucion: { label: 'En ejecución', dot: 'bg-amber-500' },
  finalizada:   { label: 'Finalizada',   dot: 'bg-emerald-500' },
  observada:    { label: 'Observada',    dot: 'bg-red-500' },
};

const PRIORITY_BADGE = {
  alta:  { label: 'Alta',  class: 'bg-red-50 text-red-700 border-red-200' },
  media: { label: 'Media', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  baja:  { label: 'Baja',  class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function RecentTasksList({ tasks }) {
  const recent = [...tasks]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tareas Recientes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{recent.length} tareas</p>
        </div>
        <Link
          to="/tasks"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ver todas <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {recent.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No hay tareas aún</p>
          </div>
        ) : (
          recent.map(task => {
            const status = STATUS_MAP[task.status] || STATUS_MAP.creada;
            const priority = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.media;
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['finalizada', 'observada'].includes(task.status);
            return (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/50 transition-colors group"
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", status.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{status.label}</span>
                    {task.community_name && (
                      <span className="text-xs text-muted-foreground/60">· {task.community_name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border", priority.class)}>
                    {priority.label}
                  </span>
                  {task.due_date && (
                    <span className={cn("text-xs", isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                      {format(new Date(task.due_date), "d MMM", { locale: es })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}