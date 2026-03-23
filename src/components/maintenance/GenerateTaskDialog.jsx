import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { addMonths, addYears, addDays, format } from 'date-fns';
import { Zap } from 'lucide-react';

function calcNext(maintenance) {
  const d = new Date(maintenance.next_execution || maintenance.start_date);
  switch (maintenance.frequency) {
    case 'mensual':        return format(addMonths(d, 1), 'yyyy-MM-dd');
    case 'trimestral':     return format(addMonths(d, 3), 'yyyy-MM-dd');
    case 'semestral':      return format(addMonths(d, 6), 'yyyy-MM-dd');
    case 'anual':          return format(addYears(d, 1),  'yyyy-MM-dd');
    case 'personalizada':  return maintenance.frequency_days
      ? format(addDays(d, Number(maintenance.frequency_days)), 'yyyy-MM-dd')
      : format(addMonths(d, 1), 'yyyy-MM-dd');
    default:               return format(addMonths(d, 1), 'yyyy-MM-dd');
  }
}

export default function GenerateTaskDialog({ open, onOpenChange, maintenance }) {
  const queryClient = useQueryClient();
  const [dueDate, setDueDate] = useState(maintenance?.next_execution || '');

  const mutation = useMutation({
    mutationFn: async () => {
      // Create the task
      await base44.entities.Task.create({
        title: maintenance.name,
        description: maintenance.description || '',
        task_type: 'preventiva',
        priority: 'media',
        status: 'creada',
        community_id: maintenance.community_id,
        community_name: maintenance.community_name,
        assigned_to: maintenance.assigned_to || '',
        assigned_to_name: maintenance.assigned_to_name || '',
        due_date: dueDate,
        procedure_id: maintenance.id, // link to maintenance via procedure_id field
      });
      // Update next_execution on the maintenance
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Generar Tarea
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Se creará una nueva tarea basada en <span className="font-semibold text-foreground">"{maintenance.name}"</span> y se actualizará la próxima ejecución.
          </p>
          <div className="space-y-1.5">
            <Label>Fecha compromiso</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Generando...' : 'Generar tarea'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}