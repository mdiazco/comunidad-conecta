import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Plus, Search, ClipboardList, CheckCircle2, AlertTriangle,
  Clock, PlayCircle, Eye, Bell, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import { isSuperAdmin } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  creada:       { label: 'Creada',       class: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400' },
  asignada:     { label: 'Asignada',     class: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500' },
  en_ejecucion: { label: 'En ejecución', class: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-500' },
  finalizada:   { label: 'Finalizada',   class: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  observada:    { label: 'Observada',    class: 'bg-red-50 text-red-700 border-red-200',              dot: 'bg-red-500' },
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

const STAT_TABS = [
  { key: 'all',         label: 'Todas',       icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50', activeBg: 'bg-slate-600', border: 'border-slate-200' },
  { key: 'active',      label: 'Activas',     icon: PlayCircle,    color: 'text-blue-600',  bg: 'bg-blue-50',  activeBg: 'bg-blue-600',  border: 'border-blue-200' },
  { key: 'overdue',     label: 'Vencidas',    icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50',   activeBg: 'bg-red-600',   border: 'border-red-200' },
  { key: 'finalizada',  label: 'Finalizadas', icon: CheckCircle2,  color: 'text-emerald-600',bg: 'bg-emerald-50', activeBg:'bg-emerald-600', border:'border-emerald-200' },
  { key: 'observada',   label: 'Observadas',  icon: Eye,           color: 'text-orange-600',bg: 'bg-orange-50', activeBg:'bg-orange-600', border:'border-orange-200' },
];

export default function Tasks() {
  const { user } = useOutletContext();
  const isAdmin = isSuperAdmin(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
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

  const now = new Date();
  const isOverdueFn = t => t.due_date && new Date(t.due_date) < now && !['finalizada', 'observada'].includes(t.status);
  const isUpcomingFn = t => {
    if (!t.due_date || ['finalizada', 'observada'].includes(t.status)) return false;
    const d = new Date(t.due_date);
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return d >= now && d <= threeDays;
  };

  const counts = {
    all:       visibleTasks.length,
    active:    visibleTasks.filter(t => !['finalizada', 'observada'].includes(t.status)).length,
    overdue:   visibleTasks.filter(isOverdueFn).length,
    finalizada: visibleTasks.filter(t => t.status === 'finalizada').length,
    observada:  visibleTasks.filter(t => t.status === 'observada').length,
  };

  // Unique assignees for filter
  const assignees = [...new Map(
    visibleTasks.filter(t => t.assigned_to_name && t.assigned_to)
      .map(t => [t.assigned_to, { email: t.assigned_to, name: t.assigned_to_name }])
  ).values()];

  // Apply tab filter
  const tabFiltered = visibleTasks.filter(t => {
    if (activeTab === 'all')       return true;
    if (activeTab === 'active')    return !['finalizada', 'observada'].includes(t.status);
    if (activeTab === 'overdue')   return isOverdueFn(t);
    return t.status === activeTab;
  });

  const filtered = tabFiltered.filter(t => {
    const matchSearch   = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus   = statusFilter === 'all' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchAssignee = assigneeFilter === 'all' || t.assigned_to === assigneeFilter;
    return matchSearch && matchStatus && matchPriority && matchAssignee;
  });

  const hasFilters = search || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all';

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tareas</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Gestiona reparaciones, mantenciones y tareas administrativas de tu comunidad en un solo lugar,
            con seguimiento en tiempo real y control total de responsables y plazos.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2 shadow-sm shrink-0 mt-1">
          <Plus className="h-4 w-4" /> Nueva Tarea
        </Button>
      </div>

      {/* ── Stat tabs / mini-dashboard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAT_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-150 text-left",
                isActive
                  ? "bg-card border-primary shadow-sm ring-1 ring-primary/20"
                  : `bg-card ${tab.border} hover:shadow-sm hover:border-primary/30`
              )}
            >
              <div className={cn("p-1.5 rounded-lg", isActive ? "bg-primary/10" : tab.bg)}>
                <tab.icon className={cn("h-4 w-4", isActive ? "text-primary" : tab.color)} />
              </div>
              <div>
                <p className={cn("text-2xl font-bold leading-none", isActive ? "text-primary" : "text-foreground")}>
                  {counts[tab.key]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{tab.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Alerts bar ── */}
      {(counts.overdue > 0 || visibleTasks.filter(isUpcomingFn).length > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {counts.overdue > 0 && (
            <button
              onClick={() => setActiveTab('overdue')}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium hover:bg-red-100 transition-colors flex-1"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{counts.overdue} tarea{counts.overdue > 1 ? 's' : ''} vencida{counts.overdue > 1 ? 's' : ''} — requieren atención inmediata</span>
            </button>
          )}
          {visibleTasks.filter(isUpcomingFn).length > 0 && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium flex-1">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{visibleTasks.filter(isUpcomingFn).length} tarea{visibleTasks.filter(isUpcomingFn).length > 1 ? 's' : ''} próxima{visibleTasks.filter(isUpcomingFn).length > 1 ? 's' : ''} a vencer (3 días)</span>
            </div>
          )}
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar tarea..."
            className="pl-8 h-8 text-sm bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[148px] h-8 text-sm bg-background">
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
        {assignees.length > 0 && (
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-background">
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {assignees.map(a => (
                <SelectItem key={a.email} value={a.email}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button
            variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setAssigneeFilter('all'); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* ── Task list ── */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-muted rounded w-2/5" />
                <div className="h-2.5 bg-muted rounded w-1/4" />
              </div>
              <div className="h-6 w-20 bg-muted rounded-md" />
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
            {hasFilters || activeTab !== 'all' ? 'Prueba con otros filtros' : 'Crea tu primera tarea para comenzar'}
          </p>
          {!hasFilters && activeTab === 'all' && (
            <Button onClick={() => setFormOpen(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Nueva Tarea
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header — desktop */}
          <div className="hidden md:grid grid-cols-[8px_1fr_130px_90px_120px_160px_100px] items-center gap-4 px-5 py-2.5 bg-muted/40 border-b border-border">
            <span />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarea</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Estado</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Prioridad</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Avance</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responsable</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Fecha</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.map(task => {
              const status   = STATUS_MAP[task.status]    || STATUS_MAP.creada;
              const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.media;
              const overdue  = isOverdueFn(task);
              const upcoming = isUpcomingFn(task);

              return (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className={cn(
                    "flex flex-col md:grid md:grid-cols-[8px_1fr_130px_90px_120px_160px_100px] items-center gap-3 md:gap-4 px-5 py-3.5 hover:bg-accent/40 transition-colors group",
                    overdue && "border-l-2 border-l-red-400"
                  )}
                >
                  {/* Status dot */}
                  <span className={cn("h-2 w-2 rounded-full shrink-0 hidden md:block", status.dot)} />

                  {/* Title + meta */}
                  <div className="min-w-0 w-full md:w-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("h-2 w-2 rounded-full shrink-0 md:hidden", status.dot)} />
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      {overdue && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                          VENCIDA
                        </span>
                      )}
                      {upcoming && !overdue && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                          PRÓXIMA
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
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-md border w-[130px] text-center shrink-0", status.class)}>
                    {status.label}
                  </span>

                  {/* Priority badge */}
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-md border w-[90px] text-center shrink-0", priority.class)}>
                    {priority.label}
                  </span>

                  {/* Assignee */}
                  <div className="flex items-center gap-1.5 w-[160px] shrink-0">
                    {task.assigned_to_name ? (
                      <>
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">
                            {task.assigned_to_name[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-foreground truncate">{task.assigned_to_name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 italic">Sin asignar</span>
                    )}
                  </div>

                  {/* Due date */}
                  <div className="w-[100px] text-center shrink-0">
                    {task.due_date ? (
                      <span className={cn(
                        "text-xs font-medium",
                        overdue ? "text-red-600 font-bold" : upcoming ? "text-amber-600 font-semibold" : "text-muted-foreground"
                      )}>
                        {format(new Date(task.due_date), "d MMM yyyy", { locale: es })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{filtered.length}</span> de{' '}
              <span className="font-medium text-foreground">{visibleTasks.length}</span> tareas
            </p>
            {counts.overdue > 0 && (
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {counts.overdue} vencida{counts.overdue > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}