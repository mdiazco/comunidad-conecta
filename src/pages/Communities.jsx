import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Building2, MapPin, Home, ArrowRight, Edit, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CommunityFormDialog from '@/components/communities/CommunityFormDialog';
import PermissionGate from '@/components/rbac/PermissionGate';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  edificio:    { label: 'Edificio',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  condominio:  { label: 'Condominio',  color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const BG_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-500',
];

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
  const canEdit   = rbac ? rbac.can('comunidad', 'editar') : true;

  return (
    <PermissionGate can={rbac ? rbac.canView('comunidad') : true} showBlocked>
      <div className="space-y-8 animate-in fade-in duration-300">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <LayoutGrid className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gestión</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Comunidades</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {communities.length > 0
                ? `${communities.length} comunidad${communities.length !== 1 ? 'es' : ''} registrada${communities.length !== 1 ? 's' : ''}`
                : 'Administra tus comunidades residenciales'}
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Nueva Comunidad
            </Button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o comuna..."
            className="pl-9 bg-card"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Loading skeletons */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                <div className="h-28 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-5 bg-muted rounded-2xl mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No hay comunidades</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              {search ? 'No se encontraron resultados para tu búsqueda.' : 'Crea tu primera comunidad para comenzar.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((community, idx) => {
              const gradient = BG_GRADIENTS[idx % BG_GRADIENTS.length];
              const typeConf = TYPE_CONFIG[community.type] || { label: community.type, color: 'bg-slate-50 text-slate-700 border-slate-200' };
              const initials = community.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

              return (
                <div
                  key={community.id}
                  className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Card top banner */}
                  <div className={cn("relative h-28 bg-gradient-to-br flex items-center justify-center", gradient)}>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent" />
                    <div className="relative h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner">
                      <span className="text-white font-extrabold text-xl tracking-tight">{initials}</span>
                    </div>
                    <Badge className={cn("absolute top-3 right-3 text-xs font-semibold border", typeConf.color)}>
                      {typeConf.label}
                    </Badge>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <h3 className="font-bold text-foreground text-base truncate">{community.name}</h3>

                    <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{community.comuna}, {community.region}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <Home className="h-3.5 w-3.5 shrink-0" />
                      <span>{community.units} unidades</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      <Link to={`/communities/${community.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1.5 group-hover:border-primary/40 group-hover:text-primary transition-colors">
                          Ver detalle <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 px-3 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditing(community); setFormOpen(true); }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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