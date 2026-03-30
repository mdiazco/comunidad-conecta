import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Shield, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MODULES, ACTIONS, SUPERADMIN_PERMISSIONS } from '@/lib/useRBAC';

const EMPTY_PERMISSIONS = Object.fromEntries(
  Object.keys(MODULES).map(mod => [mod, { ver: false, crear: false, editar: false, eliminar: false }])
);

const EMPTY_ROLE = { name: '', description: '', permissions: EMPTY_PERMISSIONS };

function RoleFormDialog({ open, onOpenChange, role, onSave }) {
  const [form, setForm] = React.useState(EMPTY_ROLE);

  React.useEffect(() => {
    if (open) {
      if (role) {
        const perms = { ...EMPTY_PERMISSIONS };
        if (role.permissions) {
          Object.keys(role.permissions).forEach(mod => {
            if (perms[mod]) perms[mod] = { ...perms[mod], ...role.permissions[mod] };
          });
        }
        setForm({ name: role.name, description: role.description || '', permissions: perms });
      } else {
        setForm(EMPTY_ROLE);
      }
    }
  }, [open, role]);

  const toggle = (mod, action) => {
    setForm(f => ({
      ...f,
      permissions: {
        ...f.permissions,
        [mod]: { ...f.permissions[mod], [action]: !f.permissions[mod][action] }
      }
    }));
  };

  const toggleModule = (mod) => {
    const allOn = ACTIONS.every(a => form.permissions[mod][a]);
    setForm(f => ({
      ...f,
      permissions: {
        ...f.permissions,
        [mod]: Object.fromEntries(ACTIONS.map(a => [a, !allOn]))
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    onSave({ ...form });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Administrador de edificio" />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>

          {/* Permissions matrix */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Permisos por módulo</p>
            <div className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-6 gap-0 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <div className="col-span-2">Módulo</div>
                {ACTIONS.map(a => <div key={a} className="text-center capitalize">{a}</div>)}
              </div>
              {/* Rows */}
              {Object.entries(MODULES).map(([mod, { label }]) => {
                const perms = form.permissions[mod] || {};
                const allOn = ACTIONS.every(a => perms[a]);
                return (
                  <div key={mod} className="grid grid-cols-6 gap-0 px-3 py-2.5 border-t hover:bg-muted/20 items-center">
                    <div className="col-span-2 flex items-center gap-2">
                      <Checkbox checked={allOn} onCheckedChange={() => toggleModule(mod)} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    {ACTIONS.map(action => (
                      <div key={action} className="flex justify-center">
                        <Checkbox
                          checked={!!perms[action]}
                          onCheckedChange={() => toggle(mod, action)}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesManagement() {
  const { user, rbac } = useOutletContext();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.Role.update(editing.id, data)
      : base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      rbac?.refreshRoles?.();
      toast.success(editing ? 'Rol actualizado' : 'Rol creado');
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      rbac?.refreshRoles?.();
      toast.success('Rol eliminado');
    },
  });

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (role) => { setEditing(role); setFormOpen(true); };

  const countPerms = (role) => {
    if (!role.permissions) return 0;
    return Object.values(role.permissions).reduce((acc, mod) => {
      return acc + Object.values(mod).filter(Boolean).length;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Gestión de Roles
          </h1>
          <p className="text-muted-foreground">Define roles y permisos por módulo para los usuarios del sistema</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Rol
        </Button>
      </div>

      {/* Superadmin role card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Super Admin</p>
              <p className="text-xs text-muted-foreground">Acceso total al sistema — rol del sistema, no editable</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary">Sistema</Badge>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-1/3" /></Card>)}</div>
      ) : roles.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay roles creados. Crea el primero.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {roles.map(role => (
            <Card key={role.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    {role.description && <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(role)} className="h-7 w-7">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(role.id)} className="h-7 w-7 text-destructive/70 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{countPerms(role)} permisos</Badge>
                  {role.permissions && Object.entries(role.permissions).map(([mod, perms]) =>
                    perms.ver ? (
                      <Badge key={mod} variant="secondary" className="text-xs capitalize">
                        {MODULES[mod]?.label || mod}
                      </Badge>
                    ) : null
                  )}
                </div>
                {/* Impersonation */}
                {rbac?.isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-1.5 h-7 text-xs"
                    onClick={() => rbac.startImpersonation(role.id)}
                  >
                    <Eye className="h-3 w-3" /> Simular vista de este rol
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoleFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        role={editing}
        onSave={(data) => saveMutation.mutate(data)}
      />
    </div>
  );
}