import React from 'react';
import { cn } from '@/lib/utils';
import { SYSTEM_LABELS, SYSTEM_ICONS } from '@/lib/expertChecklists';

export default function SystemHealthCard({ system, data }) {
  const { total, overdue, soon, ok } = data;
  const health = overdue > 0 ? 'red' : soon > 0 ? 'yellow' : 'green';

  const pct = total > 0 ? Math.round((ok / total) * 100) : 100;

  const colorMap = {
    red: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700', bar: 'bg-red-400', label: 'Crítico' },
    yellow: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700', bar: 'bg-amber-400', label: 'Atención' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', bar: 'bg-emerald-400', label: 'Al día' },
  }[health];

  return (
    <div className={cn("rounded-xl p-4 border", colorMap.bg, colorMap.border)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{SYSTEM_ICONS[system] || '🔧'}</span>
          <div>
            <p className="text-xs font-semibold text-foreground leading-tight">{SYSTEM_LABELS[system] || system}</p>
            <p className="text-xs text-muted-foreground">{total} mantención{total !== 1 ? 'es' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", colorMap.dot)} />
          <span className={cn("text-xs font-semibold", colorMap.text)}>{colorMap.label}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden mb-2">
        <div className={cn("h-full rounded-full transition-all", colorMap.bar)} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center gap-3 text-xs">
        {ok > 0 && <span className="text-emerald-700">✓ {ok} OK</span>}
        {soon > 0 && <span className="text-amber-700">⚠ {soon} pronto</span>}
        {overdue > 0 && <span className="text-red-700 font-semibold">✗ {overdue} vencida{overdue !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  );
}