import React from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function TaskSemaphore({ tasks }) {
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const overdue = tasks.filter(t =>
    t.due_date && new Date(t.due_date) < now && !['finalizada', 'observada'].includes(t.status)
  ).length;

  const upcoming = tasks.filter(t => {
    if (!t.due_date || ['finalizada', 'observada'].includes(t.status)) return false;
    const d = new Date(t.due_date);
    return d >= now && d <= threeDays;
  }).length;

  const onTrack = tasks.filter(t => {
    if (!t.due_date || ['finalizada', 'observada'].includes(t.status)) return false;
    return new Date(t.due_date) > threeDays;
  }).length;

  const total = onTrack + upcoming + overdue || 1;

  const items = [
    { label: 'Al día', count: onTrack, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500', border: 'border-emerald-200' },
    { label: 'Próximas', count: upcoming, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500', border: 'border-amber-200' },
    { label: 'Vencidas', count: overdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500', border: 'border-red-200' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Semáforo de Tareas</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Estado de vencimientos activos</p>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label} className={`flex items-center gap-3 p-3 rounded-lg border ${item.bg} ${item.border}`}>
            <div className={`p-1.5 rounded-md bg-white/70`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
              </div>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.bar}`}
                  style={{ width: `${Math.round((item.count / total) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}