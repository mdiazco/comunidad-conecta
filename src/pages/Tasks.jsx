import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Plus, Search, ClipboardList, CheckCircle2, AlertTriangle,
  Clock, PlayCircle, Eye, Filter, X, ArrowRight, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import { isSuperAdmin } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import PermissionGate from '@/components/rbac/PermissionGate';

const STATUS_MAP = {
  creada:       { label: 'Creada',       class: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400' },
  asignada:     { label: 'Asignada',     class: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500' },
  en_ejecucion: { label: 'En ejecución', class: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-500' },
  finalizada:   { label: 'Finalizada',   class: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  observada:    { label: 'Observada',    class: 'bg-red-50 text-red-700 border-red-200',              dot: 'bg-red-500' },
};

const PRIORITY_MAP = {
  alta:  { label: 'Alta',  class: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500' },
  media: { label: 'Media', class: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
  baja:  { label: 'Baja',  class: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const TYPE_MAP = {
  preventiva:     'Preventiva',
  emergencia:     'Emergencia',
  administrativa: 'Administrativa',
};

const STAT_TABS = [
  { key: 'all',        label: 'Todas',       icon: ClipboardList, gradient: 'from-slate-500 to-slate-600',   ring: 'ring-slate-200' },
  { key: 'active',     label: 'Activas',     icon: PlayCircle,    gradient: 'from-blue-500 to-blue-600',     ring: 'ring-blue-200' },
  { key: 'overdue',    label: 'Vencidas',    icon: AlertTriangle, gradient: 'from-red-500 to-red-600',       ring: 'ring-red-200' },
  { key: 'finalizada', label: 'Finalizadas', icon: CheckCircle2,  gradient: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-200' },
  { key: 'observada',  label: 'Observadas',  icon: Eye,           gradient: 'from-orange-500 to-orange-600', ring: 'ring-orange-200' },
];

export default function Tasks() {
  const { user, rbac } = useOutletContext();
  const isAdmin = isSuperAdmin(user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

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
    all:        visibleTasks.length,
    active:     visibleTasks.filter(t => !['finalizada', 'observada'].includes(t.status)).length,
    overdue:    visibleTasks.filter(isOverdueFn).length,
    finalizada: visibleTasks.filter(t => t.status === 'finalizada').length,
    observada:  visibleTasks.filter(t => t.status === 'observada').length,
  };

  const assignees = [...new Map(
    visibleTasks.filter(t => t.assigned_to_name && t.assigned_to)
      .map(t => [t.assigned_to, { email: t.assigned_to, name: t.assigned_to_name }])
  ).values()];

  const tabFiltered = visibleTasks.filter(t => {
    if (activeTab === 'all')     return true;
    if (activeTab === 'active')  return !['finalizada', 'observada'].includes(t.status);
    if (activeTab === 'overdue') return isOverdueFn(t);
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
  const canCreate = rbac ? rbac.can('tareas', 'crear') : true;

  return (
    <PermissionGate can={rbac ? rbac.canView('tareas') : true} showBlocked>
      <div className="space-y-6 animate-in fade-in duration-300">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gestión</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Tareas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {visibleTasks.length > 0
                ? `${visibleTasks.length} tarea${visibleTasks.length !== 1 ? 's' : ''} en el sistema`
                : 'Gestiona reparaciones, mantenciones y tareas administrativas'}
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setFormOpen(true)} className="gap-2 shadow-sm shrink-0">
              <Plus className="h-4 w-4" /> Nueva Tarea
            </Button>
          )}
        </div>

        {/* ── Stat tabs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAT_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative group flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all duration-200 text-left overflow-hidden",
                  isActive
                    ? "bg-card border-primary shadow-md ring-1 ring-primary/20"
                    : "bg-card border-border hover:shadow-sm hover:border-primary/30"
                )}
              >
                {/* Decorative bg glow when active */}
                {isActive && (
                  <div className={cn("absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-15 bg-gradient-to-br", tab.gradient)} />
                )}
                <div className={cn(
                  "relative p-2 rounded-xl transition-colors",
                  isActive
                    ? `bg-gradient-to-br ${tab.gradient} shadow-sm`
                    : "bg-muted"
                )}>
                  <tab.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                </div>
                <div className="relative">
                  <p className={cn("text-2xl font-extrabold leading-none tabular-nums", isActive ? "text-foreground" : "text-foreground")}>
                    {counts[tab.key]}
                  </p>
                  <p className={cn("text-xs mt-1 font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                    {tab.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Alert banners ── */}
        {(counts.overdue > 0 || visibleTasks.filter(isUpcomingFn).length > 0) && (
          <div className="flex flex-col sm:flex-row gap-2">
            {counts.overdue > 0 && (
              <button
                onClick={() => setActiveTab('overdue')}
                className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium hover:bg-red-100 transition-colors flex-1"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-left">{counts.overdue} tarea{counts.overdue > 1 ? 's' : ''} vencida{counts.overdue > 1 ? 's' : ''} — requieren atención inmediata</span>
                <ArrowRight className="h-3.5 w-3.5 ml-auto shrink-0" />
              </button>
            )}
            {visibleTasks.filter(isUpcomingFn).length > 0 && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium flex-1">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{visibleTasks.filter(isUpcomingFn).length} tarea{visibleTasks.filter(isUpcomingFn).length > 1 ? 's' : ''} próxima{visibleTasks.filter(isUpcomingFn).length > 1 ? 's' : ''} a vencer (3 días)</span>
              </div>
            )}
          </div>
        )}

        {/* ── Filters bar ── */}
        <div className="flex flex-wrap gap-2.5 p-4 bg-card border border-border rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-semibold">Filtros</span>
          </div>
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar tarea..."
              className="pl-8 h-8 text-sm bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("w-[148px] h-8 text-sm bg-background", statusFilter !== 'all' && "border-primary/50 text-primary")}>
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
            <SelectTrigger className={cn("w-[130px] h-8 text-sm bg-background", priorityFilter !== 'all' && "border-primary/50 text-primary")}>
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
              <SelectTrigger className={cn("w-[150px] h-8 text-sm bg-background", assigneeFilter !== 'all' && "border-primary/50 text-primary")}>
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
              variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setAssigneeFilter('all'); }}
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>

        {/* ── Task list ── */}
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 animate-pulse">
                <div className="h-2.5 w-2.5 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-2/5" />
                  <div className="h-2.5 bg-muted rounded w-1/4" />
                </div>
                <div className="h-6 w-20 bg-muted rounded-lg" />
                <div className="h-6 w-14 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-20 text-center">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No hay tareas</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters || activeTab !== 'all' ? 'Prueba con otros filtros' : 'Crea tu primera tarea para comenzar'}
            </p>
            {!hasFilters && activeTab === 'all' && canCreate && (
              <Button onClick={() => setFormOpen(true)} className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Nueva Tarea
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[10px_1fr_140px_100px_130px_170px_110px] items-center gap-4 px-5 py-3 bg-muted/40 border-b border-border">
              <span />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tarea</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Estado</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Prioridad</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Avance</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Responsable</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Fecha</span>
            </div>

            <div className="divide-y divide-border">
              {filtered.map(task => {
                const status   = STATUS_MAP[task.status]     || STATUS_MAP.creada;
                const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.media;
                const overdue  = isOverdueFn(task);
                const upcoming = isUpcomingFn(task);

                return (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className={cn(
                      "flex flex-col md:grid md:grid-cols-[10px_1fr_140px_100px_130px_170px_110px] items-center gap-3 md:gap-4 px-5 py-4 hover:bg-accent/50 transition-colors group",
                      overdue && "border-l-[3px] border-l-red-400"
                    )}
                  >
                    {/* Status dot */}
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 hidden md:block", status.dot)} />

                    {/* Title + meta */}
                    <div className="min-w-0 w-full md:w-auto">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("h-2 w-2 rounded-full shrink-0 md:hidden", status.dot)} />
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </p>
                        {overdue && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md shrink-0">
                            VENCIDA
                          </span>
                        )}
                        {upcoming && !overdue && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                            PRÓXIMA
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{TYPE_MAP[task.task_type]}</span>
                        {task.community_name && (
                          <span className="text-xs text-muted-foreground/50 truncate">· {task.community_name}</span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex justify-center">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg border", status.class)}>
                        {status.label}
                      </span>
                    </div>

                    {/* Priority badge */}
                    <div className="flex justify-center">
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5", priority.class)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />
                        {priority.label}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="w-full md:w-[130px] shrink-0 hidden md:block">
                      {task.status === 'finalizada' ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full w-full" />
                          </div>
                          <span className="text-[11px] font-bold text-emerald-600 tabular-nums">100%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", (task.progress ?? 0) >= 75 ? "bg-primary" : (task.progress ?? 0) >= 40 ? "bg-amber-500" : "bg-primary/50")}
                              style={{ width: `${task.progress ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{task.progress ?? 0}%</span>
                        </div>
                      )}
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center gap-2 w-full md:w-[170px] shrink-0">
                      {task.assigned_to_name ? (
                        <>
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/10">
                            <span className="text-[11px] font-bold text-primary">
                              {task.assigned_to_name[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-foreground truncate font-medium">{task.assigned_to_name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">Sin asignar</span>
                      )}
                    </div>

                    {/* Due date */}
                    <div className="w-[110px] text-center shrink-0 flex items-center justify-center gap-2">
                      {task.due_date ? (
                        <span className={cn(
                          "text-xs font-semibold",
                          overdue ? "text-red-600" : upcoming ? "text-amber-600" : "text-muted-foreground"
                        )}>
                          {format(new Date(task.due_date), "d MMM yyyy", { locale: es })}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">—</span>
                      )}
                      {canCreate && (
                        <button
                          onClick={e => { e.preventDefault(); setEditingTask(task); setFormOpen(true); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Editar tarea"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> de{' '}
                <span className="font-semibold text-foreground">{visibleTasks.length}</span> tareas
              </p>
              {counts.overdue > 0 && (
                <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {counts.overdue} vencida{counts.overdue > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        <TaskFormDialog
          open={formOpen}
          onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingTask(null); }}
          task={editingTask}
        />
      </div>
    </PermissionGate>
  );
}