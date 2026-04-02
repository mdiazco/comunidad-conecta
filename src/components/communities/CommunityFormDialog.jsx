import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REGIONES, getComunas } from '@/lib/chileanData';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

const EMPTY = {
  name: '', address: '', region: '', comuna: '', type: 'edificio',
  units: '', rut: '', contact_email: '', description: '', year_built: '',
  approval_mode: 'majority', min_committee_votes: 1, admin_can_veto: true
};

export default function CommunityFormDialog({ open, onOpenChange, community }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (community) {
      setForm({ ...EMPTY, ...community, units: String(community.units || ''), year_built: String(community.year_built || '') });
    } else {
      setForm(EMPTY);
    }
  }, [community, open]);

  const comunas = getComunas(form.region);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, units: Number(data.units), year_built: data.year_built ? Number(data.year_built) : undefined };
      if (community) return base44.entities.Community.update(community.id, payload);
      return base44.entities.Community.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      onOpenChange(false);
      toast.success(community ? 'Comunidad actualizada' : 'Comunidad creada');
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
          <DialogTitle>{community ? 'Editar Comunidad' : 'Nueva Comunidad'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <Label>Dirección *</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Región *</Label>
              <Select value={form.region} onValueChange={v => { set('region', v); set('comuna', ''); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {REGIONES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comuna *</Label>
              <Select value={form.comuna} onValueChange={v => set('comuna', v)} disabled={!form.region}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {comunas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="edificio">Edificio</SelectItem>
                  <SelectItem value="condominio">Condominio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>N° Unidades *</Label>
              <Input type="number" value={form.units} onChange={e => set('units', e.target.value)} required min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>RUT *</Label>
              <Input value={form.rut} onChange={e => set('rut', e.target.value)} required placeholder="12.345.678-9" />
            </div>
            <div>
              <Label>Email Comité *</Label>
              <Input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} required />
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
          </div>

          {/* Configuración de votación del comité */}
          <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configuración de votación del Comité</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Modo de aprobación</Label>
                <Select value={form.approval_mode} onValueChange={v => set('approval_mode', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="majority">Mayoría simple</SelectItem>
                    <SelectItem value="unanimity">Unanimidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mín. votos requeridos</Label>
                <Input type="number" min="1" value={form.min_committee_votes} onChange={e => set('min_committee_votes', Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Administrador puede vetar al Comité</p>
                <p className="text-xs text-muted-foreground">Permite al admin rechazar aunque el comité haya aprobado</p>
              </div>
              <Switch checked={form.admin_can_veto} onCheckedChange={v => set('admin_can_veto', v)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : community ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}