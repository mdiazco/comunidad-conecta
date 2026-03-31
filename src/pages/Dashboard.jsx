import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, Users, Sparkles, Wrench } from 'lucide-react';
import { isSuperAdmin } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import TaskSemaphore from '@/components/dashboard/TaskSemaphore';
import MaintenanceSemaphore from '@/components/dashboard/MaintenanceSemaphore';

const STAT_COLORS = {
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    border: 'border-blue-100',
    glow: 'shadow-blue-100',
  },
  purple: {
    gradient: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    icon: 'text-violet-600',
    border: 'border-violet-100',
    glow: 'shadow-violet-100',
  },
};

function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const c = STAT_COLORS[color] || STAT_COLORS.blue;
  return (
    <div className={cn(
      "relative bg-card rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group",
      c.border, c.glow
    )}>
      {/* Decorative circle */}
      <div className={cn(
        "absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity",
        `bg-gradient-to-br ${c.gradient}`
      )} />

      <div className="relative flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", c.bg)}>
          <Icon className={cn("h-5 w-5", c.icon)} />
        </div>
        <div className={cn("h-2 w-2 rounded-full mt-1.5 animate-pulse", `bg-gradient-to-br ${c.gradient}`)} />
      </div>

      <p className="text-4xl font-extrabold text-foreground tracking-tight tabular-nums">{value}</p>
      <p className="text-sm font-semibold text-foreground mt-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

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

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: maintenances = [] } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.Maintenance.list('-created_date'),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const greetingEmoji = hour < 12 ? '☀️' : hour < 19 ? '👋' : '🌙';

  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  const dateStr = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Hero header */}
      <div className="relative bg-gradient-to-br from-primary/90 to-primary rounded-2xl px-8 py-8 overflow-hidden shadow-lg">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-16 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/70 text-sm font-medium">{greeting} {greetingEmoji}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {firstName ? `Hola, ${firstName}` : 'Bienvenido'}
            </h1>
            <p className="text-white/60 text-sm mt-1 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {isAdmin ? 'Panel de Administración · Comunidad Conecta' : 'Mi espacio de trabajo'}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-white/90 text-sm font-medium">{dateFormatted}</p>
            <p className="text-white/50 text-xs mt-0.5">Sesión activa como {user?.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {isAdmin && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumen general</p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <StatCard title="Comunidades" value={communities.length} icon={Building2} color="blue" subtitle="Registradas" />
            <StatCard title="Miembros" value={members.length} icon={Users} color="purple" subtitle="Activos en plataforma" />
          </div>
        </div>
      )}
    </div>
  );
}