import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings as SettingsIcon, Database, Users, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatsCard from '@/components/dashboard/StatsCard';

export default function Settings() {
  const { user } = useOutletContext();

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['all-members'],
    queryFn: () => base44.entities.CommunityMember.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 50),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel Superadmin</h1>
        <p className="text-muted-foreground">Métricas globales y mantenedores del sistema</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Comunidades" value={communities.length} icon={Database} color="blue" />
        <StatsCard title="Total Miembros" value={members.filter(m => m.status !== 'inactive').length} icon={Users} color="green" />
        <StatsCard title="Total Tareas" value={tasks.length} icon={Activity} color="purple" />
        <StatsCard title="Logs Auditoría" value={logs.length} icon={SettingsIcon} color="gray" />
      </div>

      {/* System info */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Catálogos del Sistema</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg border">
              <p className="text-sm font-medium">Tipos de Comunidad</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">Edificio</Badge>
                <Badge variant="secondary">Condominio</Badge>
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-sm font-medium">Tipos de Tarea</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">Preventiva</Badge>
                <Badge variant="secondary">Emergencia</Badge>
                <Badge variant="secondary">Administrativa</Badge>
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-sm font-medium">Prioridades</p>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-red-100 text-red-700">Alta</Badge>
                <Badge className="bg-amber-100 text-amber-700">Media</Badge>
                <Badge className="bg-emerald-100 text-emerald-700">Baja</Badge>
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-sm font-medium">Roles</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">Superadmin</Badge>
                <Badge variant="secondary">Administrador</Badge>
                <Badge variant="secondary">Equipo</Badge>
                <Badge variant="secondary">Comité</Badge>
                <Badge variant="secondary">Operativo</Badge>
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="text-sm font-medium">Regiones</p>
              <p className="text-xs text-muted-foreground mt-1">16 regiones con sus respectivas comunas cargadas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Últimos Logs</CardTitle></CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin actividad registrada</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.slice(0, 20).map(log => (
                  <div key={log.id} className="p-2 rounded border text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                      <span className="text-muted-foreground">{log.entity_type}</span>
                    </div>
                    <p className="mt-1">{log.details}</p>
                    <p className="text-muted-foreground mt-1">{log.user_email}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}