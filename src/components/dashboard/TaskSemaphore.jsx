import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TaskSemaphore({ tasks }) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const overdue = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < now && !['finalizada', 'observada'].includes(t.status)
  ).length;

  const upcoming = tasks.filter(t => {
    if (!t.due_date || ['finalizada', 'observada'].includes(t.status)) return false;
    const d = new Date(t.due_date);
    return d >= now && d <= threeDaysFromNow;
  }).length;

  const onTrack = tasks.filter(t => {
    if (!t.due_date || ['finalizada', 'observada'].includes(t.status)) return false;
    return new Date(t.due_date) > threeDaysFromNow;
  }).length;

  const items = [
    { label: 'Al día', count: onTrack, color: 'bg-emerald-500' },
    { label: 'Próximas', count: upcoming, color: 'bg-amber-500' },
    { label: 'Vencidas', count: overdue, color: 'bg-red-500' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Semáforo de Tareas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {items.map(item => (
            <div key={item.label} className="flex-1 text-center">
              <div className={`h-3 rounded-full ${item.color} mb-2`} />
              <p className="text-2xl font-bold">{item.count}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}