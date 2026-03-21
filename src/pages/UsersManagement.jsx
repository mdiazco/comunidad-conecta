import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { isSuperAdmin } from '@/lib/permissions';

export default function UsersManagement() {
  const { user } = useOutletContext();
  const isAdmin = isSuperAdmin(user);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [newMember, setNewMember] = useState({ community_id: '', user_email: '', user_name: '', role: 'operativo' });
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['all-members'],
    queryFn: () => base44.entities.CommunityMember.list('-created_date'),
  });

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunityMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      setFormOpen(false);
      setNewMember({ community_id: '', user_email: '', user_name: '', role: 'operativo' });
      toast.success('Miembro agregado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunityMember.update(id, { status: 'inactive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      toast.success('Miembro desactivado');
    },
  });

  const communityMap = {};
  communities.forEach(c => { communityMap[c.id] = c.name; });

  const activeMembers = members.filter(m => m.status !== 'inactive');
  const filtered = activeMembers.filter(m =>
    (m.user_name || m.user_email || '').toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_COLORS = {
    administrador: 'bg-primary/10 text-primary',
    equipo: 'bg-amber-100 text-amber-700',
    comite: 'bg-violet-100 text-violet-700',
    operativo: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestión de miembros por comunidad</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Agregar Miembro
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Card key={i} className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-1/2" /></Card>)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No hay miembros</h3>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{m.user_name || m.user_email}</p>
                  <p className="text-sm text-muted-foreground">{m.user_email}</p>
                  <p className="text-xs text-muted-foreground mt-1">{communityMap[m.community_id] || 'Comunidad'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`capitalize ${ROLE_COLORS[m.role] || ''}`} variant="secondary">{m.role}</Badge>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(m.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Miembro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Comunidad *</Label>
              <Select value={newMember.community_id} onValueChange={v => setNewMember(p => ({ ...p, community_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={newMember.user_name} onChange={e => setNewMember(p => ({ ...p, user_name: e.target.value }))} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newMember.user_email} onChange={e => setNewMember(p => ({ ...p, user_email: e.target.value }))} required />
            </div>
            <div>
              <Label>Rol *</Label>
              <Select value={newMember.role} onValueChange={v => setNewMember(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="equipo">Equipo Administrador</SelectItem>
                  <SelectItem value="comite">Comité</SelectItem>
                  <SelectItem value="operativo">Mayordomo / Operativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={() => createMutation.mutate(newMember)} disabled={createMutation.isPending || !newMember.community_id || !newMember.user_email}>
                {createMutation.isPending ? 'Guardando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}