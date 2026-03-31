import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, ListChecks, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ChecklistPanel({ task, canEdit }) {
  const queryClient = useQueryClient();
  const [expandedNote, setExpandedNote] = useState(null);
  const [noteText, setNoteText] = useState('');

  const items = task?.checklist_items || [];
  const completed = items.filter(i => i.completed).length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  const mutation = useMutation({
    mutationFn: ({ newItems, newPct }) => base44.entities.Task.update(task.id, { checklist_items: newItems, progress: newPct }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_tasks'] });
    },
  });

  const toggle = (id) => {
    if (!canEdit) return;
    const now = new Date().toISOString();
    const updated = items.map(i => i.id === id
      ? { ...i, completed: !i.completed, completed_at: !i.completed ? now : null }
      : i
    );
    const newCompleted = updated.filter(i => i.completed).length;
    const newPct = updated.length > 0 ? Math.round((newCompleted / updated.length) * 100) : 0;
    mutation.mutate({ newItems: updated, newPct });
  };

  const saveNote = (id) => {
    const updated = items.map(i => i.id === id ? { ...i, evidence_note: noteText } : i);
    const newPct = updated.length > 0 ? Math.round((updated.filter(i => i.completed).length / updated.length) * 100) : 0;
    mutation.mutate({ newItems: updated, newPct });
    setExpandedNote(null);
    setNoteText('');
    toast.success('Nota guardada');
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Checklist de Ejecución</h3>
          </div>
          <span className={cn(
            "text-sm font-bold tabular-nums",
            pct === 100 ? "text-emerald-600" : pct > 0 ? "text-primary" : "text-muted-foreground"
          )}>
            {completed}/{items.length}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{pct}% completado</p>
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {items.map((item, idx) => (
          <div key={item.id} className="px-5 py-3.5">
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggle(item.id)}
                disabled={!canEdit || mutation.isPending}
                className={cn(
                  "mt-0.5 shrink-0 transition-colors",
                  canEdit ? "hover:scale-110" : "cursor-default",
                  item.completed ? "text-emerald-500" : "text-muted-foreground/40"
                )}
              >
                {item.completed
                  ? <CheckCircle2 className="h-5 w-5" />
                  : <Circle className="h-5 w-5" />
                }
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/50 font-mono w-4 shrink-0">{idx + 1}.</span>
                  <p className={cn(
                    "text-sm font-medium",
                    item.completed ? "line-through text-muted-foreground" : "text-foreground"
                  )}>
                    {item.title}
                  </p>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">{item.description}</p>
                )}
                {item.completed && item.completed_at && (
                  <p className="text-xs text-emerald-600 mt-0.5 ml-6">
                    ✓ Completado {new Date(item.completed_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {item.evidence_note && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 mt-1 ml-6 italic">
                    💬 {item.evidence_note}
                  </p>
                )}
              </div>

              {/* Note button */}
              {canEdit && (
                <button
                  onClick={() => {
                    if (expandedNote === item.id) { setExpandedNote(null); setNoteText(''); }
                    else { setExpandedNote(item.id); setNoteText(item.evidence_note || ''); }
                  }}
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground shrink-0"
                  title="Agregar nota"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Note editor */}
            {expandedNote === item.id && (
              <div className="mt-2 ml-8 space-y-2">
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Nota de ejecución, observación..."
                  rows={2}
                  className="w-full text-xs border border-border rounded-md p-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-6 text-xs px-3" onClick={() => saveNote(item.id)}>Guardar</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-3" onClick={() => { setExpandedNote(null); setNoteText(''); }}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}