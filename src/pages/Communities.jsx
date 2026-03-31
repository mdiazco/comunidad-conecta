import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Building2, MapPin, Home, ArrowRight, Edit, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [filterRegion, setFilterRegion] = useState('');
  const [filterComuna, setFilterComuna] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUnits, setFilterUnits] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list('-created_date'),
  });

  const regions = useMemo(() => [...new Set(communities.map(c => c.region).filter(Boolean))].sort(), [communities]);
  const comunas = useMemo(() => [...new Set(communities.filter(c => !filterRegion || c.region === filterRegion).map(c => c.comuna).filter(Boolean))].sort(), [communities, filterRegion]);

  const UNITS_RANGES = [
    { value: '1-50',   label: '1 – 50 unidades',   min: 1,   max: 50 },
    { value: '51-100', label: '51 – 100 unidades',  min: 51,  max: 100 },
    { value: '101-200',label: '101 – 200 unidades', min: 101, max: 200 },
    { value: '201+',   label: '201+ unidades',      min: 201, max: Infinity },
  ];

  const filtered = communities.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRegion && c.region !== filterRegion) return false;
    if (filterComuna && c.comuna !== filterComuna) return false;
    if (filterType && c.type !== filterType) return false;
    if (filterUnits) {
      const range = UNITS_RANGES.find(r => r.value === filterUnits);
      if (range && (c.units < range.min || c.units > range.max)) return false;
    }
    return true;
  });

  const activeFilters = [filterRegion, filterComuna, filterType, filterUnits].filter(Boolean).length;

  const clearFilters = () => {
    setFilterRegion(''); setFilterComuna(''); setFilterType(''); setFilterUnits('');
  };

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

        {/* Search + Filters */}
        <div className="space-y-3">
          {/* Filtros row */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="font-medium">Filtros</span>
            </div>

            <Select value={filterRegion} onValueChange={v => { setFilterRegion(v === '__all__' ? '' : v); setFilterComuna(''); }}>
              <SelectTrigger className={cn("h-8 text-xs w-44 bg-card", filterRegion && "border-primary/50 text-primary")}>
                <SelectValue placeholder="Región" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las regiones</SelectItem>
                {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterComuna} onValueChange={v => setFilterComuna(v === '__all__' ? '' : v)}>
              <SelectTrigger className={cn("h-8 text-xs w-40 bg-card", filterComuna && "border-primary/50 text-primary")}>
                <SelectValue placeholder="Comuna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las comunas</SelectItem>
                {comunas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={v => setFilterType(v === '__all__' ? '' : v)}>
              <SelectTrigger className={cn("h-8 text-xs w-36 bg-card", filterType && "border-primary/50 text-primary")}>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los tipos</SelectItem>
                <SelectItem value="edificio">Edificio</SelectItem>
                <SelectItem value="condominio">Condominio</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUnits} onValueChange={v => setFilterUnits(v === '__all__' ? '' : v)}>
              <SelectTrigger className={cn("h-8 text-xs w-44 bg-card", filterUnits && "border-primary/50 text-primary")}>
                <SelectValue placeholder="N° Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las unidades</SelectItem>
                {UNITS_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Limpiar ({activeFilters})
              </Button>
            )}
          </div>

          {/* Search below */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              className="pl-9 bg-card"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {filtered.length !== communities.length && (
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> de {communities.length} comunidades
            </p>
          )}
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