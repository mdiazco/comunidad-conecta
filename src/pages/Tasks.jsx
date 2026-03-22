import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, ClipboardList, ArrowUpRight, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import { isSuperAdmin } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  creada:       { label: 'Creada',       class: 'bg-slate-100 text-slate-600 border-slate-200',     dot: 'bg-slate-400' },
  asignada:     { label: 'Asignada',     class: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500' },
  en_ejecucion: { label: 'En ejecución', class: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
  finalizada:   { label: 'Finalizada',   class: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  observada:    { label: 'Observada',    class: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500' },
};

const PRIORITY_MAP = {
  alta:  { label: 'Alta',  class: 'bg-red-50 text-red-700 border-red-200' },
  media: { label: 'Media', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  baja:  { label: 'Baja',  class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const TYPE_MAP = {
  preventiva:     'Preventiva',
  emergencia:     'Emergencia',
  administrativa: 'Administrativa',
};

export default function Tasks() {
  const { user } = useOutletContext();
  const isAdmin = isSuperAdmin(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.CommunityMember.filter({ user_email: user?.email, status: 'active' }),
    enabled: !!user?.email && !isAdmin,
  });

  const visibleTasks = isAdmin ? tasks : tasks.filter(t => {
    const myCommunities = myMemberships.map(m => m.community_id);
    return myCommunities.includes(t.community_id) || t.assigned_to === user?.email;
  });

  const filtered = visibleTasks.filter(t => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const activeCount = filtered.filter(t => !['finalizada', 'observada'].includes(t.status)).length;
  const overdueCount = filtered.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && !['finalizada', 'observada'].includes(t.status)
  ).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tareas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} activas · {overdueCount > 0 && <span className="text-red-600 font-medium">{overdueCount} vencidas</span>}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar tarea..."
            className="pl-8 h-8 text-sm bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-sm bg-background">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="creada">Creada</SelectItem>
            <SelectItem value="asignada">Asignada</SelectItem>
            <SelectItem value="en_ejecucion">En ejecución</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
            <SelectItem value="observada">Observada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-8 text-sm bg-background">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda prioridad</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all' || priorityFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-muted rounded w-2/5" />
                <div className="h-2.5 bg-muted rounded w-1/4" />
              </div>
              <div className="h-6 w-16 bg-muted rounded-md" />
              <div className="h-6 w-14 bg-muted rounded-md" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No hay tareas</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== 'all' ? 'Prueba con otros filtros' : 'Crea tu primera tarea para comenzar'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-2.5 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="w-2" />
            <span>Tarea</span>
            <span className="w-24 text-center">Estado</span>
            <span className="w-16 text-center">Prioridad</span>
            <span className="w-28 text-center">Responsable</span>
            <span className="w-20 text-center">Fecha</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map(task => {
              const status   = STATUS_MAP[task.status]   || STATUS_MAP.creada;
              const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.media;
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['finalizada', 'observada'].includes(task.status);

              return (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex flex-col md:grid md:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 md:gap-4 px-5 py-3.5 hover:bg-accent/40 transition-colors group"
                >
                  {/* Dot */}
                  <span className={cn("h-2 w-2 rounded-full shrink-0 hidden md:block", status.dot)} />

                  {/* Title + meta */}
                  <div className="min-w-0 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full shrink-0 md:hidden", status.dot)} />
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      {isOverdue && (
                        <span className="hidden sm:inline text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                          Vencida
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{TYPE_MAP[task.task_type]}</span>
                      {task.community_name && (
                        <span className="text-xs text-muted-foreground/60 truncate">· {task.community_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-md border w-24 text-center shrink-0", status.class)}>
                    {status.label}
                  </span>

                  {/* Priority badge */}
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-md border w-16 text-center shrink-0", priority.class)}>
                    {priority.label}
                  </span>

                  {/* Assignee */}
                  <div className="flex items-center gap-1.5 w-28 shrink-0 justify-center">
                    {task.assigned_to_name ? (
                      <>
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-primary">
                            {task.assigned_to_name[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{task.assigned_to_name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Due date */}
                  <div className="w-20 text-center shrink-0">
                    {task.due_date ? (
                      <span className={cn("text-xs font-medium", isOverdue ? "text-red-600" : "text-muted-foreground")}>
                        {format(new Date(task.due_date), "d MMM", { locale: es })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="px-5 py-3 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{filtered.length}</span> de{' '}
              <span className="font-medium text-foreground">{visibleTasks.length}</span> tareas
            </p>
          </div>
        </div>
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}