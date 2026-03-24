import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const SERVICE_TYPES = [
  { value: 'ascensores', label: 'Ascensores' },
  { value: 'gas', label: 'Gas' },
  { value: 'aseo', label: 'Aseo' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'plomeria', label: 'Plomería' },
  { value: 'jardineria', label: 'Jardinería' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'climatizacion', label: 'Climatización' },
  { value: 'pintura', label: 'Pintura' },
  { value: 'otro', label: 'Otro' },
];

const EMPTY = { name: '', service_type: '', contact_name: '', contact_email: '', contact_phone: '', rut: '', community_id: '', community_name: '', status: 'active' };

export default function ProviderFormDialog({ open, onOpenChange, provider = null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list(),
  });

  useEffect(() => {
    if (open) {
      setForm(provider ? { ...EMPTY, ...provider } : EMPTY);
    }
  }, [open, provider]);

  const set = (field, value) => setForm(f => {
    const updated = { ...f, [field]: value };
    if (field === 'community_id') {
      const comm = communities.find(c => c.id === value);
      updated.community_name = comm?.name || '';
    }
    return updated;
  });

  const mutation = useMutation({
    mutationFn: (data) => provider
      ? base44.entities.Provider.update(provider.id, data)
      : base44.entities.Provider.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast.success(provider ? 'Proveedor actualizado' : 'Proveedor creado');
      onOpenChange(false);
    },
    onError: (err) => toast.error('Error: ' + (err?.message || 'intenta de nuevo')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.service_type || !form.community_id) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{provider ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Nombre <span className="text-red-500">*</span></Label>
            <Input placeholder="Ej: Servicios Técnicos ABC" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de servicio <span className="text-red-500">*</span></Label>
              <Select value={form.service_type} onValueChange={v => set('service_type', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>RUT</Label>
              <Input placeholder="12.345.678-9" value={form.rut} onChange={e => set('rut', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Comunidad <span className="text-red-500">*</span></Label>
            <Select value={form.community_id} onValueChange={v => set('community_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona comunidad" /></SelectTrigger>
              <SelectContent>
                {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contacto</Label>
              <Input placeholder="Nombre del contacto" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="+56 9 1234 5678" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="contacto@proveedor.cl" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : provider ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}