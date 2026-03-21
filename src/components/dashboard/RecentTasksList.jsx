import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_MAP = {
  creada: { label: 'Creada', class: 'bg-muted text-muted-foreground' },
  asignada: { label: 'Asignada', class: 'bg-primary/10 text-primary' },
  en_ejecucion: { label: 'En ejecución', class: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', class: 'bg-emerald-100 text-emerald-700' },
  observada: { label: 'Observada', class: 'bg-red-100 text-red-700' },
};

const PRIORITY_MAP = {
  alta: { label: 'Alta', class: 'bg-red-100 text-red-700' },
  media: { label: 'Media', class: 'bg-amber-100 text-amber-700' },
  baja: { label: 'Baja', class: 'bg-emerald-100 text-emerald-700' },
};

export default function RecentTasksList({ tasks, title = "Tareas Recientes" }) {
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Link to="/tasks" className="text-sm text-primary hover:underline">Ver todas</Link>
        </div>
      </CardHeader>
      <CardContent>
        {recentTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No hay tareas aún</p>
        ) : (
          <div className="space-y-3">
            {recentTasks.map(task => {
              const status = STATUS_MAP[task.status] || STATUS_MAP.creada;
              const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.media;
              return (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${status.class}`} variant="secondary">{status.label}</Badge>
                      <Badge className={`text-xs ${priority.class}`} variant="secondary">{priority.label}</Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.due_date), "d MMM", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}