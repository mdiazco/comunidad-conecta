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
import { getCurrentYear, getYearEndDate } from '@/lib/expertChecklists';

const EMPTY = {
  community_id: '', community_name: '',
  provider_id: '', provider_name: '',
  service_type: '', service_description: '',
  start_date: '', end_date: '',
  monthly_cost: '', annual_cost: '',
  currency: 'CLP', status: 'activo', notes: '',
  year: getCurrentYear(),
};

const SERVICE_LABELS = {
  ascensores: 'Ascensores', gas: 'Gas', aseo: 'Aseo', electricidad: 'Electricidad',
  plomeria: 'Plomería', jardineria: 'Jardinería', seguridad: 'Seguridad',
  climatizacion: 'Climatización', pintura: 'Pintura', otro: 'Otro',
};

export default function ContractFormDialog({ open, onOpenChange, contract = null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const { data: communities = [] } = useQuery({ queryKey: ['communities'], queryFn: () => base44.entities.Community.list() });
  const { data: providers = [] } = useQuery({ queryKey: ['providers'], queryFn: () => base44.entities.Provider.list() });

  useEffect(() => {
    if (open) {
      if (contract) {
        setForm({ ...EMPTY, ...contract });
      } else {
        const yr = getCurrentYear();
        setForm({ ...EMPTY, year: yr, end_date: getYearEndDate(yr) });
      }
    }
  }, [open, contract]);

  const set = (field, value) => {
    setForm(f => {
      const updated = { ...f, [field]: value };
      if (field === 'community_id') {
        const comm = communities.find(c => c.id === value);
        updated.community_name = comm?.name || '';
      }
      if (field === 'provider_id') {
        const prov = providers.find(p => p.id === value);
        updated.provider_name = prov?.name || '';
      }
      if (field === 'monthly_cost' && value) {
        updated.annual_cost = String(Number(value) * 12);
      }
      return updated;
    });
  };

  const mutation = useMutation({
    mutationFn: data => contract ? base44.entities.Contract.update(contract.id, data) : base44.entities.Contract.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success(contract ? 'Contrato actualizado' : 'Contrato creado');
      onOpenChange(false);
    },
    onError: err => toast.error('Error: ' + (err?.message || 'intenta de nuevo')),
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.community_id || !form.provider_id || !form.service_type || !form.start_date || !form.end_date) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    const payload = { ...form };
    if (payload.monthly_cost) payload.monthly_cost = Number(payload.monthly_cost);
    if (payload.annual_cost) payload.annual_cost = Number(payload.annual_cost);
    else delete payload.annual_cost;
    if (!payload.monthly_cost) delete payload.monthly_cost;
    mutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? 'Editar Contrato' : 'Nuevo Contrato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Comunidad <span className="text-red-500">*</span></Label>
              <Select value={form.community_id} onValueChange={v => set('community_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>{communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Proveedor <span className="text-red-500">*</span></Label>
              <Select value={form.provider_id} onValueChange={v => set('provider_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>{providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de servicio <span className="text-red-500">*</span></Label>
              <Select value={form.service_type} onValueChange={v => set('service_type', v)}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={v => set('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLP">CLP (Pesos)</SelectItem>
                  <SelectItem value="UF">UF</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción del servicio</Label>
            <Textarea placeholder="Detalle del servicio contratado..." rows={2} value={form.service_description} onChange={e => set('service_description', e.target.value)} className="resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha inicio <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha término <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Costo mensual</Label>
              <Input type="number" min={0} placeholder="0" value={form.monthly_cost} onChange={e => set('monthly_cost', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Costo anual</Label>
              <Input type="number" min={0} placeholder="0" value={form.annual_cost} onChange={e => set('annual_cost', e.target.value)} className="bg-muted/40" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="por_renovar">Por renovar</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="suspendido">Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea placeholder="Notas adicionales..." rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className="resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : contract ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}