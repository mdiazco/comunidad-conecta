import React from 'react';
import { cn } from '@/lib/utils';

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100',  dot: 'bg-blue-500' },
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-50',  icon: 'text-amber-600',  border: 'border-amber-100', dot: 'bg-amber-500' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    border: 'border-red-100',   dot: 'bg-red-500' },
  purple: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100', dot: 'bg-violet-500' },
  gray:   { bg: 'bg-slate-50',  icon: 'text-slate-600',  border: 'border-slate-100', dot: 'bg-slate-500' },
};

export default function StatsCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={cn(
      "bg-card rounded-xl border p-5 card-hover",
      c.border
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", c.bg)}>
          <Icon className={cn("h-5 w-5", c.icon)} />
        </div>
        <div className={cn("h-2 w-2 rounded-full mt-1", c.dot)} />
      </div>
      <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </div>
  );
}