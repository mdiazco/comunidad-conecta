import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Building2, MapPin, Users, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import CommunityFormDialog from '@/components/communities/CommunityFormDialog';

import PermissionGate from '@/components/rbac/PermissionGate';

export default function Communities() {
  const { user, rbac } = useOutletContext();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list('-created_date'),
  });

  const filtered = communities.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.comuna?.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = rbac ? rbac.can('comunidad', 'crear') : true;
  const canEdit = rbac ? rbac.can('comunidad', 'editar') : true;

  return (
    <PermissionGate can={rbac ? rbac.canView('comunidad') : true} showBlocked>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Comunidades</h1>
          <p className="text-muted-foreground">Gestión de comunidades residenciales</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Comunidad
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar comunidad..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No hay comunidades</h3>
          <p className="text-muted-foreground mt-1">Crea tu primera comunidad para comenzar</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(community => (
            <Card key={community.id} className="p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{community.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{community.comuna}, {community.region}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 capitalize">
                  {community.type}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{community.units} unidades</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Link to={`/communities/${community.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                  </Button>
                </Link>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setEditing(community); setFormOpen(true); }}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <CommunityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        community={editing}
      />
    </div>
    </PermissionGate>
  );
}