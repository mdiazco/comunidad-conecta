import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EMPTY = {
  community_id: '', title: '', description: '', task_type: 'reparacion',
  priority: 'media', assigned_to: '', due_date: '', supplier_id: '', supplier_name: '',
  requires_budget: false,
};

export default function TaskFormDialog({ open, onOpenChange, task, communityId }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list('-created_date'),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['community-members-for-task', form.community_id],
    queryFn: () => base44.entities.CommunityMember.filter({ community_id: form.community_id, status: 'active' }),
    enabled: !!form.community_id,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date'),
  });

  useEffect(() => {
    if (task) {
      setForm({ ...EMPTY, ...task, due_date: task.due_date ? task.due_date.split('T')[0] : '' });
    } else {
      setForm({ ...EMPTY, community_id: communityId || '' });
    }
  }, [task, open, communityId]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const community = communities.find(c => c.id === data.community_id);
      const member = members.find(m => m.user_email === data.assigned_to);
      const supplier = suppliers.find(s => s.id === data.supplier_id);
      const isRepair = data.task_type === 'reparacion';
      const payload = {
        ...data,
        community_name: community?.name || '',
        assigned_to_name: member?.user_name || data.assigned_to,
        supplier_name: supplier?.name || '',
        status: isRepair && data.requires_budget
          ? 'pendiente_presupuestos'
          : data.assigned_to ? 'asignada' : 'creada',
      };
      if (task) return base44.entities.Task.update(task.id, payload);
      return base44.entities.Task.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['community-tasks'] });
      onOpenChange(false);
      toast.success(task ? 'Tarea actualizada' : 'Tarea creada');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Comunidad *</Label>
            <Select value={form.community_id} onValueChange={v => set('community_id', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar comunidad" /></SelectTrigger>
              <SelectContent>
                {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.task_type} onValueChange={v => set('task_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reparacion">Reparación</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                  <SelectItem value="administrativa">Administrativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridad *</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsable</Label>
              <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v)}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin asignar</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.user_email}>
                      {m.user_name || m.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha comprometida</Label>
              <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          {/* Requires budget toggle — only for reparacion */}
          {form.task_type === 'reparacion' && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-emerald-800">Requiere comparación de presupuestos</p>
                <p className="text-xs text-emerald-600">Mínimo 3 presupuestos antes de aprobar</p>
              </div>
              <button
                type="button"
                onClick={() => set('requires_budget', !form.requires_budget)}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  form.requires_budget ? 'bg-emerald-600' : 'bg-slate-200'
                )}
              >
                <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', form.requires_budget ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
            </div>
          )}
          {!(form.task_type === 'reparacion' && form.requires_budget) && (
          <div>
            <Label>Proveedor / Contratista</Label>
            <Select value={form.supplier_id || ''} onValueChange={v => set('supplier_id', v)}>
              <SelectTrigger><SelectValue placeholder="Sin proveedor asignado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Sin proveedor</SelectItem>
                {suppliers.filter(s => s.status === 'active').map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.giro ? ` — ${s.giro}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : task ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}