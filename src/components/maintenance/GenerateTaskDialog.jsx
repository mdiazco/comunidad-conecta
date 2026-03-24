import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { addMonths, addYears, addDays, format } from 'date-fns';
import { Zap, ListChecks, CheckCircle2 } from 'lucide-react';

function calcNext(maintenance) {
  const d = new Date(maintenance.next_execution || maintenance.start_date);
  switch (maintenance.frequency) {
    case 'mensual':       return format(addMonths(d, 1), 'yyyy-MM-dd');
    case 'trimestral':    return format(addMonths(d, 3), 'yyyy-MM-dd');
    case 'semestral':     return format(addMonths(d, 6), 'yyyy-MM-dd');
    case 'anual':         return format(addYears(d, 1),  'yyyy-MM-dd');
    case 'personalizada': return maintenance.frequency_days
      ? format(addDays(d, Number(maintenance.frequency_days)), 'yyyy-MM-dd')
      : format(addMonths(d, 1), 'yyyy-MM-dd');
    default:              return format(addMonths(d, 1), 'yyyy-MM-dd');
  }
}

export default function GenerateTaskDialog({ open, onOpenChange, maintenance }) {
  const queryClient = useQueryClient();
  const [dueDate, setDueDate] = useState('');

  // Reset dueDate when dialog opens
  React.useEffect(() => {
    if (open && maintenance) {
      setDueDate(maintenance.next_execution || '');
    }
  }, [open, maintenance]);

  const checklist = maintenance?.checklist_items || [];

  const mutation = useMutation({
    mutationFn: async () => {
      // Create the task with inherited checklist (all unchecked)
      const checklistForTask = checklist.map(item => ({
        ...item,
        completed: false,
        completed_at: null,
        completed_by: null,
        evidence_note: '',
      }));

      await base44.entities.Task.create({
        title: maintenance.name,
        description: maintenance.description || '',
        task_type: 'preventiva',
        priority: 'media',
        status: 'creada',
        progress: 0,
        community_id: maintenance.community_id,
        community_name: maintenance.community_name,
        assigned_to: maintenance.assigned_to || '',
        assigned_to_name: maintenance.assigned_to_name || '',
        due_date: dueDate,
        procedure_id: maintenance.id,
        checklist_items: checklistForTask,
      });

      // Advance next_execution
      const nextExec = calcNext(maintenance);
      await base44.entities.Maintenance.update(maintenance.id, {
        next_execution: nextExec,
        last_execution: maintenance.next_execution || maintenance.start_date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_tasks', maintenance?.id] });
      toast.success('Tarea generada y próxima ejecución actualizada');
      onOpenChange(false);
    },
  });

  if (!maintenance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Generar Tarea de Mantención
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Se creará una tarea para <span className="font-semibold text-foreground">"{maintenance.name}"</span> con el checklist y responsable configurados.
          </p>

          <div className="space-y-1.5">
            <Label>Fecha compromiso</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          {/* Preview checklist */}
          {checklist.length > 0 && (
            <div className="bg-muted/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Checklist heredado ({checklist.length} pasos)</span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {checklist.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-4 w-4 rounded border border-muted-foreground/30 flex items-center justify-center shrink-0 text-[9px] font-bold">
                      {idx + 1}
                    </div>
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checklist.length === 0 && (
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Esta mantención no tiene checklist configurado.</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Puedes editarla para agregar pasos.</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
              <Zap className="h-4 w-4" />
              {mutation.isPending ? 'Generando...' : 'Generar tarea'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}