import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, ClipboardList, Users, AlertTriangle, CheckCircle2, Wrench, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import StatsCard from '@/components/dashboard/StatsCard';
import TaskSemaphore from '@/components/dashboard/TaskSemaphore';
import RecentTasksList from '@/components/dashboard/RecentTasksList';
import { isSuperAdmin } from '@/lib/permissions';

export default function Dashboard() {
  const { user } = useOutletContext();
  const isAdmin = isSuperAdmin(user);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list('-created_date'),
    enabled: isAdmin,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['community-members'],
    queryFn: () => base44.entities.CommunityMember.list(),
    enabled: isAdmin,
  });

  const { data: maintenances = [] } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.Maintenance.list('-created_date', 200),
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: () => base44.entities.CommunityMember.filter({ user_email: user?.email, status: 'active' }),
    enabled: !!user?.email && !isAdmin,
  });

  const visibleTasks = isAdmin ? tasks : tasks.filter(t => {
    const myCommunities = myMemberships.map(m => m.community_id);
    return myCommunities.includes(t.community_id);
  });

  const activeTasks    = visibleTasks.filter(t => !['finalizada', 'observada'].includes(t.status));
  const overdueTasks   = visibleTasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && !['finalizada', 'observada'].includes(t.status)
  );
  const completedTasks = visibleTasks.filter(t => t.status === 'finalizada');

  const now = new Date();
  const overdueMaintenances = maintenances.filter(m => m.active && m.next_execution && differenceInDays(new Date(m.next_execution), now) < 0);
  const soonMaintenances = maintenances.filter(m => m.active && m.next_execution && differenceInDays(new Date(m.next_execution), now) >= 0 && differenceInDays(new Date(m.next_execution), now) <= 7);
  const healthStatus = overdueMaintenances.length > 0 ? 'red' : soonMaintenances.length > 0 ? 'yellow' : 'green';
  const healthLabel = { green: 'Óptimo', yellow: 'Atención', red: 'Crítico' }[healthStatus];
  const healthColors = { green: 'text-emerald-600 bg-emerald-50 border-emerald-200', yellow: 'text-amber-600 bg-amber-50 border-amber-200', red: 'text-red-600 bg-red-50 border-red-200' };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{greeting} 👋</p>
          <h1 className="text-2xl font-bold text-foreground mt-0.5">
            {isAdmin ? 'Panel de Administración' : 'Mi Dashboard'}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && (
          <StatsCard title="Comunidades" value={communities.length} icon={Building2} color="blue" />
        )}
        <StatsCard title="Tareas Activas" value={activeTasks.length} icon={ClipboardList} color="purple" />
        <StatsCard title="Vencidas" value={overdueTasks.length} icon={AlertTriangle} color="red" />
        <StatsCard title="Completadas" value={completedTasks.length} icon={CheckCircle2} color="green" />
        {isAdmin && (
          <StatsCard title="Usuarios" value={members.length} icon={Users} color="gray" subtitle="Miembros activos" />
        )}
      </div>

      {/* Building Health Banner */}
      <Link to="/building-health" className={`flex items-center gap-4 px-5 py-4 rounded-xl border ${healthColors[healthStatus]} hover:opacity-80 transition-opacity cursor-pointer`}>
        <HeartPulse className="h-6 w-6 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Salud del Edificio: {healthLabel}</p>
          <p className="text-xs opacity-80">
            {overdueMaintenances.length > 0 ? `${overdueMaintenances.length} mantención${overdueMaintenances.length !== 1 ? 'es' : ''} vencida${overdueMaintenances.length !== 1 ? 's' : ''}` :
             soonMaintenances.length > 0 ? `${soonMaintenances.length} mantención${soonMaintenances.length !== 1 ? 'es' : ''} próxima${soonMaintenances.length !== 1 ? 's' : ''} (7 días)` :
             'Todas las mantenciones están al día'}
          </p>
        </div>
        <span className="text-xs font-semibold opacity-70">Ver detalle →</span>
      </Link>

      {/* Semaphore + Recent */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <TaskSemaphore tasks={visibleTasks} />
        </div>
        <div className="lg:col-span-2">
          <RecentTasksList tasks={visibleTasks} />
        </div>
      </div>
    </div>
  );
}