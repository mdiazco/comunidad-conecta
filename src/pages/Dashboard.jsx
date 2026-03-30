import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, Users } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import { isSuperAdmin } from '@/lib/permissions';

export default function Dashboard() {
  const { user } = useOutletContext();
  const isAdmin = isSuperAdmin(user);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list('-created_date'),
    enabled: isAdmin,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['community-members'],
    queryFn: () => base44.entities.CommunityMember.list(),
    enabled: isAdmin,
  });

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
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <StatsCard title="Comunidades" value={communities.length} icon={Building2} color="blue" />
          <StatsCard title="Usuarios" value={members.length} icon={Users} color="gray" subtitle="Miembros activos" />
        </div>
      )}
    </div>
  );
}