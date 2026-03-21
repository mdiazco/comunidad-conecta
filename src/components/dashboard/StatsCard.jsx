import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, color, subtitle }) {
  const colorMap = {
    blue: 'bg-primary/10 text-primary',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-violet-100 text-violet-600',
    gray: 'bg-muted text-muted-foreground',
  };

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl", colorMap[color] || colorMap.blue)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}