import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building2, CheckCircle2, AlertTriangle, Clock, TrendingUp, BarChart2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SYSTEM_LABELS, SYSTEM_ICONS, getCurrentYear } from '@/lib/expertChecklists';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SystemHealthCard from '@/components/health/SystemHealthCard';
import HealthSemaphore from '@/components/health/HealthSemaphore';
import YearCloseDialog from '@/components/health/YearCloseDialog';
import { Button } from '@/components/ui/button';

export default function BuildingHealth() {
  const [selectedCommunity, setSelectedCommunity] = useState('all');
  const [yearCloseOpen, setYearCloseOpen] = useState(false);
  const currentYear = getCurrentYear();

  const { data: communities = [] } = useQuery({ queryKey: ['communities'], queryFn: () => base44.entities.Community.list() });
  const { data: maintenances = [] } = useQuery({ queryKey: ['maintenances'], queryFn: () => base44.entities.Maintenance.list('-created_date', 500) });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 500) });
  const { data: contracts = [] } = useQuery({ queryKey: ['contracts'], queryFn: () => base44.entities.Contract.list() });

  const filteredMaintenances = selectedCommunity === 'all' ? maintenances : maintenances.filter(m => m.community_id === selectedCommunity);
  const filteredTasks = selectedCommunity === 'all' ? tasks : tasks.filter(t => t.community_id === selectedCommunity);
  const filteredContracts = selectedCommunity === 'all' ? contracts : contracts.filter(c => c.community_id === selectedCommunity);

  // Health calculations
  const now = new Date();
  const activeMaintenances = filteredMaintenances.filter(m => m.active && m.status !== 'cerrada_fin_año');
  const overdueMaintenances = activeMaintenances.filter(m => m.next_execution && differenceInDays(new Date(m.next_execution), now) < 0);
  const soonMaintenances = activeMaintenances.filter(m => m.next_execution && differenceInDays(new Date(m.next_execution), now) >= 0 && differenceInDays(new Date(m.next_execution), now) <= 14);
  const okMaintenances = activeMaintenances.filter(m => !m.next_execution || differenceInDays(new Date(m.next_execution), now) > 14);

  const openTasks = filteredTasks.filter(t => !['finalizada', 'cerrada_fin_año'].includes(t.status));
  const overdueTasks = openTasks.filter(t => t.due_date && differenceInDays(new Date(t.due_date), now) < 0);
  const completedTasks = filteredTasks.filter(t => t.status === 'finalizada');

  const expiringContracts = filteredContracts.filter(c => {
    if (!c.end_date) return false;
    const days = differenceInDays(new Date(c.end_date), now);
    return days >= 0 && days <= 30;
  });
  const expiredContracts = filteredContracts.filter(c => c.end_date && differenceInDays(new Date(c.end_date), now) < 0 && c.status !== 'vencido');

  // Compliance rate
  const totalActive = activeMaintenances.length;
  const onTrack = okMaintenances.length;
  const complianceRate = totalActive > 0 ? Math.round((onTrack / totalActive) * 100) : 100;

  // Overall health: red if overdue > 0, yellow if soon > 0 or overdue tasks > 0, green otherwise
  const overallHealth = overdueMaintenances.length > 0 || overdueTasks.length > 0 ? 'red'
    : soonMaintenances.length > 0 || expiringContracts.length > 0 ? 'yellow'
    : 'green';

  // Group maintenances by system
  const systemGroups = {};
  activeMaintenances.forEach(m => {
    const sys = m.system_type || 'otro';
    if (!systemGroups[sys]) systemGroups[sys] = { total: 0, overdue: 0, soon: 0, ok: 0 };
    const days = m.next_execution ? differenceInDays(new Date(m.next_execution), now) : null;
    systemGroups[sys].total++;
    if (days === null || days > 14) systemGroups[sys].ok++;
    else if (days >= 0) systemGroups[sys].soon++;
    else systemGroups[sys].overdue++;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salud del Edificio</h1>
          <p className="text-sm text-muted-foreground mt-1">Estado integral del mantenimiento — Ciclo {currentYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todas las comunidades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las comunidades</SelectItem>
              {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setYearCloseOpen(true)} className="gap-2 shrink-0">
            <RefreshCw className="h-4 w-4" /> Cierre de Año
          </Button>
        </div>
      </div>

      {/* Overall Semaphore */}
      <HealthSemaphore
        health={overallHealth}
        complianceRate={complianceRate}
        overdue={overdueMaintenances.length + overdueTasks.length}
        soon={soonMaintenances.length}
        contracts={expiringContracts.length}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '% Cumplimiento', value: `${complianceRate}%`, color: complianceRate >= 80 ? 'text-emerald-600' : complianceRate >= 60 ? 'text-amber-600' : 'text-red-600', bg: complianceRate >= 80 ? 'bg-emerald-50' : complianceRate >= 60 ? 'bg-amber-50' : 'bg-red-50', icon: TrendingUp },
          { label: 'Mantenciones OK', value: okMaintenances.length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
          { label: 'Tareas vencidas', value: overdueTasks.length, color: overdueTasks.length > 0 ? 'text-red-600' : 'text-muted-foreground', bg: overdueTasks.length > 0 ? 'bg-red-50' : 'bg-card', icon: AlertTriangle },
          { label: 'Contratos por renovar', value: expiringContracts.length, color: expiringContracts.length > 0 ? 'text-amber-600' : 'text-muted-foreground', bg: expiringContracts.length > 0 ? 'bg-amber-50' : 'bg-card', icon: Clock },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl p-4 border border-border", s.bg)}>
            <div className="flex items-center gap-2 mb-1"><s.icon className={cn("h-4 w-4", s.color)} /></div>
            <p className={cn("text-3xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts banner */}
      {(overdueMaintenances.length > 0 || overdueTasks.length > 0 || expiringContracts.length > 0 || expiredContracts.length > 0) && (
        <div className="space-y-2">
          {overdueMaintenances.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div><strong>{overdueMaintenances.length} mantención{overdueMaintenances.length !== 1 ? 'es' : ''} vencida{overdueMaintenances.length !== 1 ? 's'  : ''}.</strong> {overdueMaintenances.slice(0, 3).map(m => m.name).join(', ')}{overdueMaintenances.length > 3 ? '...' : ''}</div>
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div><strong>{overdueTasks.length} tarea{overdueTasks.length !== 1 ? 's' : ''} vencida{overdueTasks.length !== 1 ? 's' : ''}.</strong> Revisar asignaciones y fechas comprometidas.</div>
            </div>
          )}
          {expiringContracts.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <Clock className="h-4 w-4 shrink-0 mt-0.5" />
              <div><strong>{expiringContracts.length} contrato{expiringContracts.length !== 1 ? 's' : ''} vence{expiringContracts.length === 1 ? '' : 'n'} en 30 días.</strong> Gestionar renovación.</div>
            </div>
          )}
        </div>
      )}

      {/* Systems grid */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" /> Estado por Sistema Técnico
        </h2>
        {Object.keys(systemGroups).length === 0 ? (
          <div className="bg-card border border-border rounded-xl py-10 text-center text-muted-foreground text-sm">
            No hay mantenciones con sistema técnico asignado en este período
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Object.entries(systemGroups).map(([sys, data]) => (
              <SystemHealthCard key={sys} system={sys} data={data} />
            ))}
          </div>
        )}
      </div>

      {/* Recent overdue list */}
      {overdueMaintenances.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-red-50/50">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Mantenciones Vencidas
            </p>
          </div>
          <div className="divide-y divide-border">
            {overdueMaintenances.slice(0, 8).map(m => {
              const days = Math.abs(differenceInDays(new Date(m.next_execution), now));
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-lg">{SYSTEM_ICONS[m.system_type] || '🔧'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.community_name} · {SYSTEM_LABELS[m.system_type] || 'Sistema'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-red-600">Hace {days}d</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(m.next_execution), "d MMM", { locale: es })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <YearCloseDialog open={yearCloseOpen} onOpenChange={setYearCloseOpen} communities={communities} />
    </div>
  );
}