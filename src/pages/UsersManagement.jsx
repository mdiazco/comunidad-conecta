import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Users, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { isSuperAdmin } from '@/lib/permissions';

// Mapeo entre rol de comunidad y nombre de rol RBAC
const COMMUNITY_ROLE_TO_RBAC = {
  administrador: 'Administrador',
  equipo: 'Equipo Administrador',
  comite: 'Comité',
  operativo: 'Mayordomo / Operativo',
};

export default function UsersManagement() {
  const { user, rbac } = useOutletContext();
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

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Crear el miembro en la comunidad
      const member = await base44.entities.CommunityMember.create(data);

      // 2. Buscar el rol RBAC que corresponde al rol de comunidad
      const rbacRoleName = COMMUNITY_ROLE_TO_RBAC[data.role];
      const rbacRole = roles.find(r => r.name === rbacRoleName);

      // 3. Si existe el rol RBAC, buscar el usuario por email y asignarle el rbac_role_id
      if (rbacRole && data.user_email) {
        const matchingUser = allUsers.find(u => u.email === data.user_email);
        if (matchingUser) {
          await base44.auth.updateMe({ rbac_role_id: rbacRole.id });
          // Actualizar en la entidad User directamente si encontramos el usuario
          await base44.entities.User.update(matchingUser.id, { rbac_role_id: rbacRole.id });
        }
      }

      return member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setFormOpen(false);
      setNewMember({ community_id: '', user_email: '', user_name: '', role: 'operativo' });
      toast.success('Miembro agregado y permisos RBAC asignados');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      toast.success('Miembro agregado (sin usuario de plataforma vinculado aún)');
      setFormOpen(false);
      setNewMember({ community_id: '', user_email: '', user_name: '', role: 'operativo' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunityMember.update(id, { status: 'inactive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      toast.success('Miembro desactivado');
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole, userEmail }) => {
      await base44.entities.CommunityMember.update(memberId, { role: newRole });
      const rbacRoleName = COMMUNITY_ROLE_TO_RBAC[newRole];
      const rbacRole = roles.find(r => r.name === rbacRoleName);
      if (rbacRole && userEmail) {
        const matchingUser = allUsers.find(u => u.email === userEmail);
        if (matchingUser) {
          await base44.entities.User.update(matchingUser.id, { rbac_role_id: rbacRole.id });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Rol actualizado correctamente');
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
          {filtered.map(m => {
            const rbacRoleName = COMMUNITY_ROLE_TO_RBAC[m.role];
            const rbacRole = roles.find(r => r.name === rbacRoleName);
            const linkedUser = allUsers.find(u => u.email === m.user_email);
            const hasRbacLinked = linkedUser?.rbac_role_id === rbacRole?.id;
            return (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{m.user_name || m.user_email}</p>
                  <p className="text-sm text-muted-foreground">{m.user_email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{communityMap[m.community_id] || 'Comunidad'}</p>
                    {rbacRole && (
                      <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${hasRbacLinked ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        <Shield className="h-2.5 w-2.5" />
                        {hasRbacLinked ? `RBAC: ${rbacRoleName}` : 'RBAC pendiente'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <Select
                      value={m.role}
                      onValueChange={v => changeRoleMutation.mutate({ memberId: m.id, newRole: v, userEmail: m.user_email })}
                    >
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrador">Administrador</SelectItem>
                        <SelectItem value="equipo">Equipo Administrador</SelectItem>
                        <SelectItem value="comite">Comité</SelectItem>
                        <SelectItem value="operativo">Mayordomo / Operativo</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`capitalize ${ROLE_COLORS[m.role] || ''}`} variant="secondary">{m.role}</Badge>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(m.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            );
          })}
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
              <Label>Rol en la comunidad *</Label>
              <Select value={newMember.role} onValueChange={v => setNewMember(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="equipo">Equipo Administrador</SelectItem>
                  <SelectItem value="comite">Comité</SelectItem>
                  <SelectItem value="operativo">Mayordomo / Operativo</SelectItem>
                </SelectContent>
              </Select>
              {newMember.role && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5">
                  <Shield className="h-3 w-3 text-primary shrink-0" />
                  <span>Asignará permisos RBAC: <strong className="text-foreground">{COMMUNITY_ROLE_TO_RBAC[newMember.role]}</strong></span>
                </div>
              )}
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