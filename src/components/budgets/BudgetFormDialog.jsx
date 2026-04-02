import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';

const EMPTY = { supplier_name: '', supplier_id: '', amount: '', description: '', notes: '', file_url: '' };

export default function BudgetFormDialog({ open, onOpenChange, taskId, communityId }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date'),
  });

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', taskId] });
      toast.success('Presupuesto agregado');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al guardar presupuesto'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.supplier_name.trim() || !form.amount) {
      toast.error('Proveedor y monto son obligatorios');
      return;
    }
    const sup = suppliers.find(s => s.id === form.supplier_id);
    mutation.mutate({
      task_id: taskId,
      community_id: communityId,
      supplier_id: form.supplier_id || '',
      supplier_name: sup?.name || form.supplier_name,
      amount: Number(form.amount),
      description: form.description,
      notes: form.notes,
      file_url: form.file_url,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            Agregar Presupuesto
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Proveedor *</Label>
            <Select
              value={form.supplier_id}
              onValueChange={v => {
                const sup = suppliers.find(s => s.id === v);
                setForm(f => ({ ...f, supplier_id: v, supplier_name: sup?.name || '' }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar proveedor registrado..." /></SelectTrigger>
              <SelectContent>
                {suppliers.filter(s => s.status === 'active').map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.giro ? ` — ${s.giro}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!form.supplier_id && (
              <Input
                placeholder="O escribe el nombre del proveedor"
                value={form.supplier_name}
                onChange={e => set('supplier_name', e.target.value)}
                className="mt-1"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Monto (CLP) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                min={0}
                step={1000}
                placeholder="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción del trabajo</Label>
            <Textarea
              rows={3}
              placeholder="Detalla qué incluye este presupuesto..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notas adicionales</Label>
            <Input
              placeholder="Tiempo estimado, condiciones, etc."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Agregar presupuesto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}