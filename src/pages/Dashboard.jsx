import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, ClipboardList, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
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