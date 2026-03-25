import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

const CONFIG = {
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    title: 'Estado General: Óptimo',
    subtitle: 'Todas las mantenciones están al día',
    badge: 'bg-emerald-100 text-emerald-800',
    badgeLabel: '🟢 VERDE',
  },
  yellow: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    title: 'Estado General: Atención Requerida',
    subtitle: 'Hay mantenciones próximas o contratos por renovar',
    badge: 'bg-amber-100 text-amber-800',
    badgeLabel: '🟡 AMARILLO',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertOctagon,
    iconColor: 'text-red-600',
    title: 'Estado General: Crítico',
    subtitle: 'Existen mantenciones o tareas vencidas que requieren acción inmediata',
    badge: 'bg-red-100 text-red-800',
    badgeLabel: '🔴 ROJO',
  },
};

export default function HealthSemaphore({ health, complianceRate, overdue, soon, contracts }) {
  const cfg = CONFIG[health];
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-2xl border-2 p-6", cfg.bg, cfg.border)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Semaphore visual */}
          <div className="flex flex-col gap-1.5 p-2 bg-gray-800 rounded-xl">
            <span className={cn("w-5 h-5 rounded-full", health === 'red' ? 'bg-red-500 shadow-[0_0_10px_4px_rgba(239,68,68,0.6)]' : 'bg-red-900/40')} />
            <span className={cn("w-5 h-5 rounded-full", health === 'yellow' ? 'bg-amber-400 shadow-[0_0_10px_4px_rgba(251,191,36,0.6)]' : 'bg-amber-900/40')} />
            <span className={cn("w-5 h-5 rounded-full", health === 'green' ? 'bg-emerald-500 shadow-[0_0_10px_4px_rgba(16,185,129,0.6)]' : 'bg-emerald-900/40')} />
          </div>
          <div>
            <span className={cn("inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-1", cfg.badge)}>{cfg.badgeLabel}</span>
            <h2 className="text-lg font-bold text-foreground">{cfg.title}</h2>
            <p className="text-sm text-muted-foreground">{cfg.subtitle}</p>
          </div>
        </div>
        <div className="sm:ml-auto flex gap-4 sm:gap-6">
          <div className="text-center">
            <p className={cn("text-3xl font-black", complianceRate >= 80 ? 'text-emerald-600' : complianceRate >= 60 ? 'text-amber-600' : 'text-red-600')}>{complianceRate}%</p>
            <p className="text-xs text-muted-foreground">Cumplimiento</p>
          </div>
          {overdue > 0 && (
            <div className="text-center">
              <p className="text-3xl font-black text-red-600">{overdue}</p>
              <p className="text-xs text-muted-foreground">Vencidas</p>
            </div>
          )}
          {contracts > 0 && (
            <div className="text-center">
              <p className="text-3xl font-black text-amber-600">{contracts}</p>
              <p className="text-xs text-muted-foreground">Contratos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}