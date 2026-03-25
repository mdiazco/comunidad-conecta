import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { getCurrentYear, getYearEndDate } from '@/lib/expertChecklists';
import { addMonths, addYears, addDays, format } from 'date-fns';

function calcNextExecution(startDate, frequency, frequencyDays) {
  if (!startDate) return null;
  const d = new Date(startDate);
  switch (frequency) {
    case 'mensual': return format(addMonths(d, 1), 'yyyy-MM-dd');
    case 'trimestral': return format(addMonths(d, 3), 'yyyy-MM-dd');
    case 'semestral': return format(addMonths(d, 6), 'yyyy-MM-dd');
    case 'anual': return format(addYears(d, 1), 'yyyy-MM-dd');
    case 'personalizada': return frequencyDays ? format(addDays(d, Number(frequencyDays)), 'yyyy-MM-dd') : null;
    default: return null;
  }
}

export default function YearCloseDialog({ open, onOpenChange, communities }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('confirm'); // confirm | running | done
  const [selectedCommunity, setSelectedCommunity] = useState('all');
  const [stats, setStats] = useState({ closed: 0, duplicated: 0, tasksClosed: 0 });

  const currentYear = getCurrentYear();
  const nextYear = currentYear + 1;

  const { data: maintenances = [] } = useQuery({ queryKey: ['maintenances'], queryFn: () => base44.entities.Maintenance.list('-created_date', 500) });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-created_date', 500) });

  const runYearClose = async () => {
    setStep('running');
    let closed = 0, duplicated = 0, tasksClosed = 0;

    const targetMaintanences = selectedCommunity === 'all'
      ? maintenances.filter(m => m.active && m.status !== 'cerrada_fin_año')
      : maintenances.filter(m => m.active && m.status !== 'cerrada_fin_año' && m.community_id === selectedCommunity);

    const targetTasks = selectedCommunity === 'all'
      ? tasks.filter(t => !['finalizada', 'cerrada_fin_año'].includes(t.status))
      : tasks.filter(t => !['finalizada', 'cerrada_fin_año'].includes(t.status) && t.community_id === selectedCommunity);

    // Close active maintenances
    for (const m of targetMaintanences) {
      await base44.entities.Maintenance.update(m.id, { status: 'cerrada_fin_año', active: false });
      closed++;

      // Duplicate for next year
      const newStartDate = `${nextYear}-01-01`;
      const newEndDate = getYearEndDate(nextYear);
      const newNextExec = calcNextExecution(newStartDate, m.frequency, m.frequency_days);
      const duplicate = {
        name: m.name,
        description: m.description,
        type: m.type,
        system_type: m.system_type,
        frequency: m.frequency,
        frequency_days: m.frequency_days,
        start_date: newStartDate,
        end_date: newEndDate,
        next_execution: newNextExec || undefined,
        assigned_to: m.assigned_to,
        assigned_to_name: m.assigned_to_name,
        provider_id: m.provider_id,
        provider_name: m.provider_name,
        community_id: m.community_id,
        community_name: m.community_name,
        active: true,
        status: 'activa',
        checklist_items: m.checklist_items || [],
        year: nextYear,
      };
      // Remove undefined
      Object.keys(duplicate).forEach(k => duplicate[k] === undefined && delete duplicate[k]);
      await base44.entities.Maintenance.create(duplicate);
      duplicated++;
    }

    // Close open tasks
    for (const t of targetTasks) {
      await base44.entities.Task.update(t.id, { status: 'cerrada_fin_año' });
      tasksClosed++;
    }

    setStats({ closed, duplicated, tasksClosed });
    queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setStep('done');
  };

  const handleClose = () => {
    setStep('confirm');
    setStats({ closed: 0, duplicated: 0, tasksClosed: 0 });
    onOpenChange(false);
  };

  const targetCount = selectedCommunity === 'all'
    ? maintenances.filter(m => m.active && m.status !== 'cerrada_fin_año').length
    : maintenances.filter(m => m.active && m.status !== 'cerrada_fin_año' && m.community_id === selectedCommunity).length;

  const taskCount = selectedCommunity === 'all'
    ? tasks.filter(t => !['finalizada', 'cerrada_fin_año'].includes(t.status)).length
    : tasks.filter(t => !['finalizada', 'cerrada_fin_año'].includes(t.status) && t.community_id === selectedCommunity).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" /> Cierre de Año {currentYear}
          </DialogTitle>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-semibold mb-1">Esta acción realizará lo siguiente:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Cerrar <strong>{targetCount}</strong> mantenciones activas con estado "cerrada_fin_año"</li>
                    <li>• Duplicar todas en nuevo ciclo <strong>{nextYear}</strong> con fechas actualizadas</li>
                    <li>• Cerrar <strong>{taskCount}</strong> tareas pendientes sin finalizar</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Comunidad a cerrar</Label>
              <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las comunidades</SelectItem>
                  {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              Nuevo año de vigencia: <strong className="text-foreground">{nextYear}</strong> · Fecha fin: <strong className="text-foreground">31/12/{nextYear}</strong>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={runYearClose} disabled={targetCount === 0} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Iniciar cierre de año
              </Button>
            </div>
          </div>
        )}

        {step === 'running' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Procesando cierre de año...</p>
            <p className="text-xs text-muted-foreground">Esto puede tomar unos momentos</p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4 gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h3 className="text-lg font-bold text-foreground">¡Cierre completado!</h3>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2 text-sm">
              <p className="text-emerald-700">✓ <strong>{stats.closed}</strong> mantenciones cerradas en {currentYear}</p>
              <p className="text-emerald-700">✓ <strong>{stats.duplicated}</strong> mantenciones duplicadas para {nextYear}</p>
              <p className="text-emerald-700">✓ <strong>{stats.tasksClosed}</strong> tareas pendientes cerradas</p>
            </div>
            <Button onClick={handleClose} className="w-full">Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}