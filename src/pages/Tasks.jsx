import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Filter, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import TaskFormDialog from '@/components/tasks/TaskFormDialog';
import { isSuperAdmin } from '@/lib/permissions';

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

const TYPE_MAP = {
  preventiva: 'Preventiva',
  emergencia: 'Emergencia',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestión y seguimiento de tareas operativas</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Tarea
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar tarea..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="creada">Creada</SelectItem>
            <SelectItem value="asignada">Asignada</SelectItem>
            <SelectItem value="en_ejecucion">En ejecución</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
            <SelectItem value="observada">Observada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Card key={i} className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-2/3" /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No hay tareas</h3>
          <p className="text-muted-foreground mt-1">Crea tu primera tarea para comenzar</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const status = STATUS_MAP[task.status] || STATUS_MAP.creada;
            const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP.media;
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['finalizada','observada'].includes(task.status);
            return (
              <Link key={task.id} to={`/tasks/${task.id}`}>
                <Card className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${isOverdue ? 'border-destructive/50' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{task.title}</p>
                        {isOverdue && <Badge className="bg-red-100 text-red-700 text-xs shrink-0">Vencida</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <Badge className={`text-xs ${status.class}`} variant="secondary">{status.label}</Badge>
                        <Badge className={`text-xs ${priority.class}`} variant="secondary">{priority.label}</Badge>
                        <span className="text-xs text-muted-foreground">{TYPE_MAP[task.task_type]}</span>
                        {task.community_name && (
                          <span className="text-xs text-muted-foreground">• {task.community_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right shrink-0">
                      {task.assigned_to_name && <p className="text-xs">{task.assigned_to_name}</p>}
                      {task.due_date && (
                        <p className={`text-xs ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                          {format(new Date(task.due_date), "d MMM yyyy", { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}