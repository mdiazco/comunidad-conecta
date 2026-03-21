import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, ClipboardList, Users, AlertTriangle, CheckCircle } from 'lucide-react';
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

  // Filter tasks based on role
  const visibleTasks = isAdmin ? tasks : tasks.filter(t => {
    const myCommunities = myMemberships.map(m => m.community_id);
    return myCommunities.includes(t.community_id);
  });

  const activeTasks = visibleTasks.filter(t => !['finalizada', 'observada'].includes(t.status));
  const overdueTasks = visibleTasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && !['finalizada', 'observada'].includes(t.status)
  );
  const completedTasks = visibleTasks.filter(t => t.status === 'finalizada');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isAdmin ? 'Panel de Administración' : 'Mi Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido, {user?.full_name || user?.email}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin && (
          <StatsCard
            title="Comunidades"
            value={communities.length}
            icon={Building2}
            color="blue"
          />
        )}
        <StatsCard
          title="Tareas Activas"
          value={activeTasks.length}
          icon={ClipboardList}
          color="purple"
        />
        <StatsCard
          title="Vencidas"
          value={overdueTasks.length}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title="Completadas"
          value={completedTasks.length}
          icon={CheckCircle}
          color="green"
        />
        {isAdmin && (
          <StatsCard
            title="Usuarios"
            value={members.length}
            icon={Users}
            color="gray"
            subtitle="Miembros activos"
          />
        )}
      </div>

      {/* Semaphore + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
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