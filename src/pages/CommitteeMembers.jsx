import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Plus, Search, X, Mail, Building2, ShieldCheck, Pencil, Trash2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isSuperAdmin } from '@/lib/permissions';
import CommitteeMemberFormDialog from '@/components/committee/CommitteeMemberFormDialog';

const ROLE_MAP = {
  administrador: { label: 'Administrador', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  comite:        { label: 'Comité',         class: 'bg-violet-50 text-violet-700 border-violet-200' },
  equipo:        { label: 'Equipo',          class: 'bg-amber-50 text-amber-700 border-amber-200' },
  operativo:     { label: 'Operativo',       class: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const STATUS_MAP = {
  active:   { label: 'Activo',   class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactivo', class: 'bg-red-50 text-red-600 border-red-200' },
};

export default function CommitteeMembers() {
  const { user } = useOutletContext();
  const isAdmin = isSuperAdmin(user);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [communityFilter, setCommunityFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['committee-members'],
    queryFn: () => base44.entities.CommunityMember.list('-created_date', 300),
  });

  const { data: communities = [] } = useQuery({
    queryKey: ['communities-list'],
    queryFn: () => base44.entities.Community.list('name', 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunityMember.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['committee-members'] }),
  });

  // Filter: only committee members (role = 'comite') but show all roles if admin
  const allMembers = isAdmin ? members : members.filter(m => m.role === 'comite');

  const filtered = allMembers.filter(m => {
    const matchSearch = !search ||
      m.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || m.role === roleFilter;
    const matchCommunity = communityFilter === 'all' || m.community_id === communityFilter;
    return matchSearch && matchRole && matchCommunity;
  });

  // Stats
  const committeeCount = members.filter(m => m.role === 'comite' && m.status === 'active').length;
  const adminCount = members.filter(m => m.role === 'administrador' && m.status === 'active').length;
  const uniqueCommunities = [...new Set(members.map(m => m.community_id))].length;

  const getCommunityName = (id) => communities.find(c => c.id === id)?.name || '—';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-violet-100 rounded-lg">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gestión</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Miembros del Comité</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona los miembros, roles y accesos por comunidad</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Agregar Miembro
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Comité activos', value: committeeCount, icon: ShieldCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Administradores', value: adminCount, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Comunidades', value: uniqueCommunities, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl shrink-0", s.bg)}>
              <s.icon className={cn("h-5 w-5", s.color)} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 p-4 bg-card border border-border rounded-2xl shadow-sm">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            className="pl-8 h-8 text-sm bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Role filter buttons */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'comite', label: 'Comité' },
            { key: 'administrador', label: 'Admin' },
            { key: 'equipo', label: 'Equipo' },
            { key: 'operativo', label: 'Operativo' },
          ].map(r => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                roleFilter === r.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {communities.length > 1 && (
          <select
            value={communityFilter}
            onChange={e => setCommunityFilter(e.target.value)}
            className="h-8 text-sm bg-background border border-input rounded-md px-3 text-foreground"
          >
            <option value="all">Todas las comunidades</option>
            {communities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {(search || roleFilter !== 'all' || communityFilter !== 'all') && (
          <Button
            variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
            onClick={() => { setSearch(''); setRoleFilter('all'); setCommunityFilter('all'); }}
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-muted rounded w-1/3" />
                <div className="h-2.5 bg-muted rounded w-1/4" />
              </div>
              <div className="h-6 w-20 bg-muted rounded-md" />
              <div className="h-6 w-24 bg-muted rounded-md" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-20 text-center">
          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Sin miembros</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search || roleFilter !== 'all' ? 'Prueba con otros filtros' : 'Agrega el primer miembro del comité'}
          </p>
          {isAdmin && !search && roleFilter === 'all' && (
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Agregar Miembro
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-[1fr_200px_100px_120px_100px_80px] items-center gap-4 px-6 py-3 bg-muted/40 border-b border-border">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Miembro</span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Comunidad</span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rol</span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Estado</span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Acciones</span>
          </div>

          <div className="divide-y divide-border/60">
            {filtered.map(member => {
              const role   = ROLE_MAP[member.role]   || ROLE_MAP.operativo;
              const status = STATUS_MAP[member.status] || STATUS_MAP.active;
              return (
                <div
                  key={member.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_200px_100px_120px_100px_80px] items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors"
                >
                  {/* Avatar + name + email */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0 ring-1 ring-violet-200">
                      <span className="text-sm font-bold text-violet-600">
                        {(member.user_name || member.user_email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {member.user_name || <span className="italic text-muted-foreground">Sin nombre</span>}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{member.user_email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Community */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{getCommunityName(member.community_id)}</span>
                  </div>

                  {/* Role badge */}
                  <div>
                    <span className={cn("inline-flex text-xs font-semibold px-2.5 py-1 rounded-md border", role.class)}>
                      {role.label}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div>
                    <span className={cn("inline-flex text-xs font-semibold px-2.5 py-1 rounded-md border", status.class)}>
                      {status.label}
                    </span>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => { setEditing(member); setFormOpen(true); }}
                        className="p-2 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-500 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este miembro?')) deleteMutation.mutate(member.id);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-muted/20 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> de{' '}
              <span className="font-semibold text-foreground">{allMembers.length}</span> miembros
            </p>
          </div>
        </div>
      )}

      <CommitteeMemberFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        member={editing}
        communities={communities}
      />
    </div>
  );
}