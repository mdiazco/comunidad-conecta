import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { addDays, addMonths, addYears, format } from 'date-fns';
import ChecklistEditor from './ChecklistEditor';

const FREQ_OPTIONS = [
  { value: 'mensual',       label: 'Mensual' },
  { value: 'trimestral',    label: 'Trimestral (3 meses)' },
  { value: 'semestral',     label: 'Semestral (6 meses)' },
  { value: 'anual',         label: 'Anual' },
  { value: 'personalizada', label: 'Personalizada (días)' },
];

function calcNextExecution(startDate, frequency, frequencyDays) {
  if (!startDate) return '';
  const d = new Date(startDate);
  switch (frequency) {
    case 'mensual':       return format(addMonths(d, 1), 'yyyy-MM-dd');
    case 'trimestral':    return format(addMonths(d, 3), 'yyyy-MM-dd');
    case 'semestral':     return format(addMonths(d, 6), 'yyyy-MM-dd');
    case 'anual':         return format(addYears(d, 1),  'yyyy-MM-dd');
    case 'personalizada': return frequencyDays ? format(addDays(d, Number(frequencyDays)), 'yyyy-MM-dd') : '';
    default:              return '';
  }
}

const EMPTY = {
  name: '', description: '', type: 'preventiva', frequency: 'mensual',
  frequency_days: '', start_date: '', next_execution: '', assigned_to: '', assigned_to_name: '',
  community_id: '', community_name: '', active: true, checklist_items: [],
};

export default function MaintenanceFormDialog({ open, onOpenChange, maintenance = null, defaultCommunityId = '' }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['community_members', form.community_id],
    queryFn: () => base44.entities.CommunityMember.filter({ community_id: form.community_id }),
    enabled: !!form.community_id,
  });

  useEffect(() => {
    if (open) {
      if (maintenance) {
        setForm({ ...EMPTY, ...maintenance, checklist_items: maintenance.checklist_items || [] });
      } else {
        const comm = communities.find(c => c.id === defaultCommunityId);
        setForm({ ...EMPTY, community_id: defaultCommunityId, community_name: comm?.name || '' });
      }
    }
  }, [open, maintenance, defaultCommunityId, communities]);

  const set = (field, value) => {
    setForm(f => {
      const updated = { ...f, [field]: value };
      if (['start_date', 'frequency', 'frequency_days'].includes(field)) {
        updated.next_execution = calcNextExecution(
          field === 'start_date' ? value : updated.start_date,
          field === 'frequency' ? value : updated.frequency,
          field === 'frequency_days' ? value : updated.frequency_days
        );
      }
      if (field === 'community_id') {
        const comm = communities.find(c => c.id === value);
        updated.community_name = comm?.name || '';
        updated.assigned_to = '';
        updated.assigned_to_name = '';
      }
      if (field === 'assigned_to') {
        const member = members.find(m => m.user_email === value);
        updated.assigned_to_name = member?.user_name || value;
      }
      return updated;
    });
  };

  const mutation = useMutation({
    mutationFn: (data) => maintenance
      ? base44.entities.Maintenance.update(maintenance.id, data)
      : base44.entities.Maintenance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      toast.success(maintenance ? 'Mantención actualizada' : 'Mantención creada');
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.community_id || !form.start_date) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{maintenance ? 'Editar Mantención' : 'Nueva Mantención'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label>Nombre <span className="text-red-500">*</span></Label>
            <Input placeholder="Ej: Mantención ascensor" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea placeholder="Detalle de la mantención..." rows={2} value={form.description} onChange={e => set('description', e.target.value)} className="resize-none" />
          </div>

          {/* Tipo + Frecuencia */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo <span className="text-red-500">*</span></Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="correctiva">Correctiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frecuencia <span className="text-red-500">*</span></Label>
              <Select value={form.frequency} onValueChange={v => set('frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQ_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.frequency === 'personalizada' && (
            <div className="space-y-1.5">
              <Label>Cada cuántos días</Label>
              <Input type="number" min={1} placeholder="30" value={form.frequency_days} onChange={e => set('frequency_days', e.target.value)} />
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha de inicio <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Próxima ejecución</Label>
              <Input type="date" value={form.next_execution} onChange={e => set('next_execution', e.target.value)} className="bg-muted/40" />
            </div>
          </div>

          {/* Comunidad */}
          <div className="space-y-1.5">
            <Label>Comunidad <span className="text-red-500">*</span></Label>
            <Select value={form.community_id} onValueChange={v => set('community_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona comunidad" /></SelectTrigger>
              <SelectContent>
                {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Responsable */}
          <div className="space-y-1.5">
            <Label>Responsable</Label>
            <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v)} disabled={!form.community_id}>
              <SelectTrigger>
                <SelectValue placeholder={form.community_id ? 'Selecciona responsable' : 'Primero selecciona comunidad'} />
              </SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.user_email} value={m.user_email}>
                    {m.user_name || m.user_email} — {m.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checklist */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            <ChecklistEditor
              items={form.checklist_items}
              onChange={items => set('checklist_items', items)}
            />
          </div>

          {/* Activa */}
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
            <div>
              <p className="text-sm font-medium">Mantención activa</p>
              <p className="text-xs text-muted-foreground">Genera tareas automáticamente</p>
            </div>
            <Switch checked={form.active} onCheckedChange={v => set('active', v)} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : maintenance ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}