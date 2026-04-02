import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const EMPTY = { community_id: '', user_email: '', user_name: '', role: 'comite', status: 'active' };

export default function CommitteeMemberFormDialog({ open, onOpenChange, member, communities = [] }) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setForm(member ? { ...EMPTY, ...member } : EMPTY);
  }, [open, member]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (member?.id) return base44.entities.CommunityMember.update(member.id, data);
      return base44.entities.CommunityMember.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['committee-members'] });
      toast.success(member ? 'Miembro actualizado' : 'Miembro agregado');
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.community_id || !form.user_email || !form.role) return;
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? 'Editar Miembro' : 'Agregar Miembro al Comité'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label>Comunidad <span className="text-destructive">*</span></Label>
            <Select value={form.community_id} onValueChange={v => set('community_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar comunidad..." />
              </SelectTrigger>
              <SelectContent>
                {communities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Email del usuario <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.user_email}
              onChange={e => set('user_email', e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre completo"
              value={form.user_name}
              onChange={e => set('user_name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rol <span className="text-destructive">*</span></Label>
              <Select value={form.role} onValueChange={v => set('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comite">Comité</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="equipo">Equipo</SelectItem>
                  <SelectItem value="operativo">Operativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending || !form.community_id || !form.user_email}>
              {mutation.isPending ? 'Guardando...' : member ? 'Guardar cambios' : 'Agregar miembro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}