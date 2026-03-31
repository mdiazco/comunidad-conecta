import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Wrench, AlertTriangle, Clock, Pencil, Trash2,
  ToggleLeft, ToggleRight, Eye, Filter, X, CheckCircle2, Activity, ZapOff
} from 'lucide-react';
import { SYSTEM_LABELS, SYSTEM_ICONS, getCurrentYear } from '@/lib/expertChecklists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import MaintenanceFormDialog from '@/components/maintenance/MaintenanceFormDialog';
import { toast } from 'sonner';
import PermissionGate from '@/components/rbac/PermissionGate';
import { useOutletContext } from 'react-router-dom';

const FREQ_LABELS = {
  mensual: 'Mensual', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual', personalizada: 'Personalizada',
};

const TYPE_STYLES = {
  preventiva: 'bg-blue-50 text-blue-700 border-blue-200',
  correctiva:  'bg-amber-50 text-amber-700 border-amber-200',
};

function getUrgency(m) {
  if (!m.active) return 'inactive';
  if (!m.next_execution) return 'ok';
  const days = differenceInDays(new Date(m.next_execution), new Date());
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'ok';
}

const URGENCY = {
  overdue:  { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200',         label: 'Vencida' },
  soon:     { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'Próxima' },
  ok:       { dot: 'bg-emerald-500', badge: '',                                                label: '' },
  inactive: { dot: 'bg-slate-300',   badge: 'bg-slate-50 text-slate-500 border-slate-200',   label: 'Inactiva' },
};

const STAT_TABS = [
  { key: 'all',      label: 'Total',        icon: Wrench,      gradient: 'from-slate-500 to-slate-600',     ring: 'ring-slate-200' },
  { key: 'active',   label: 'Activas',      icon: Activity,    gradient: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-200' },
  { key: 'overdue',  label: 'Vencidas',     icon: AlertTriangle,gradient: 'from-red-500 to-red-600',       ring: 'ring-red-200' },
  { key: 'soon',     label: 'Próx. 7 días', icon: Clock,       gradient: 'from-amber-500 to-amber-600',     ring: 'ring-amber-200' },
];

export default function Maintenances() {
  const { rbac } = useOutletContext() || {};
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterYear, setFilterYear] = useState(String(getCurrentYear()));
  const [activeTab, setActiveTab] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: maintenances = [], isLoading } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => base44.entities.Maintenance.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Maintenance.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maintenances'] }); toast.success('Mantención eliminada'); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Maintenance.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenances'] }),
  });

  const currentYear = getCurrentYear();
  const years = [...new Set(maintenances.map(m => m.year || currentYear))].sort((a, b) => b - a);

  const counts = {
    all:     maintenances.length,
    active:  maintenances.filter(m => m.active).length,
    overdue: maintenances.filter(m => getUrgency(m) === 'overdue').length,
    soon:    maintenances.filter(m => getUrgency(m) === 'soon').length,
  };

  const tabFiltered = maintenances.filter(m => {
    if (activeTab === 'all')    return true;
    if (activeTab === 'active') return m.active;
    if (activeTab === 'overdue') return getUrgency(m) === 'overdue';
    if (activeTab === 'soon')   return getUrgency(m) === 'soon';
    return true;
  });

  const filtered = tabFiltered.filter(m => {
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.community_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || m.type === filterType;
    const matchYear = filterYear === 'all' || String(m.year || currentYear) === filterYear;
    return matchSearch && matchType && matchYear;
  });

  const hasFilters = search || filterType !== 'all' || filterYear !== String(currentYear);
  const canCreate = rbac ? rbac.can('mantenciones', 'crear') : true;

  const handleEdit = (m) => { setEditing(m); setFormOpen(true); };
  const handleNew  = () => { setEditing(null); setFormOpen(true); };

  return (
    <PermissionGate can={rbac ? rbac.canView('mantenciones') : true} showBlocked>
      <div className="space-y-6 animate-in fade-in duration-300">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operaciones</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Mantenciones</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {maintenances.length > 0
                ? `${maintenances.length} mantención${maintenances.length !== 1 ? 'es' : ''} registrada${maintenances.length !== 1 ? 's' : ''}`
                : 'Planifica y automatiza las mantenciones preventivas y correctivas'}
            </p>
          </div>
          {canCreate && (
            <Button onClick={handleNew} className="gap-2 shadow-sm shrink-0">
              <Plus className="h-4 w-4" /> Nueva Mantención
            </Button>
          )}
        </div>

        {/* ── Stat tabs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative group flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all duration-200 text-left overflow-hidden",
                  isActive
                    ? "bg-card border-primary shadow-md ring-1 ring-primary/20"
                    : "bg-card border-border hover:shadow-sm hover:border-primary/30"
                )}
              >
                {isActive && (
                  <div className={cn("absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-15 bg-gradient-to-br", tab.gradient)} />
                )}
                <div className={cn(
                  "relative p-2 rounded-xl transition-colors",
                  isActive ? `bg-gradient-to-br ${tab.gradient} shadow-sm` : "bg-muted"
                )}>
                  <tab.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                </div>
                <div className="relative">
                  <p className="text-2xl font-extrabold leading-none tabular-nums text-foreground">
                    {counts[tab.key]}
                  </p>
                  <p className={cn("text-xs mt-1 font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                    {tab.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Alert banners ── */}
        {(counts.overdue > 0 || counts.soon > 0) && (
          <div className="flex flex-col sm:flex-row gap-2">
            {counts.overdue > 0 && (
              <button
                onClick={() => setActiveTab('overdue')}
                className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium hover:bg-red-100 transition-colors flex-1"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-left">{counts.overdue} mantención{counts.overdue !== 1 ? 'es' : ''} vencida{counts.overdue !== 1 ? 's' : ''} — requieren atención inmediata</span>
              </button>
            )}
            {counts.soon > 0 && (
              <button
                onClick={() => setActiveTab('soon')}
                className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium hover:bg-amber-100 transition-colors flex-1"
              >
                <Clock className="h-4 w-4 shrink-0" />
                <span>{counts.soon} mantención{counts.soon !== 1 ? 'es' : ''} próxima{counts.soon !== 1 ? 's' : ''} en los próximos 7 días</span>
              </button>
            )}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-2.5 p-4 bg-card border border-border rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-semibold">Filtros</span>
          </div>
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar mantención..."
              className="pl-8 h-8 text-sm bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { value: 'all', label: 'Todos los tipos' },
              { value: 'preventiva', label: 'Preventiva' },
              { value: 'correctiva', label: 'Correctiva' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors h-8",
                  filterType === f.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >{f.label}</button>
            ))}
          </div>
          <div className="h-5 w-px bg-border self-center" />
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterYear('all')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors h-8", filterYear === 'all' ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}
            >Todos los años</button>
            {years.map(y => (
              <button
                key={y}
                onClick={() => setFilterYear(String(y))}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors h-8", filterYear === String(y) ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}
              >{y}</button>
            ))}
          </div>
          {hasFilters && (
            <Button
              variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
              onClick={() => { setSearch(''); setFilterType('all'); setFilterYear(String(currentYear)); }}
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </Button>
          )}
        </div>

        {/* ── List ── */}
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 animate-pulse">
                <div className="h-2.5 w-2.5 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-2/5" />
                  <div className="h-2.5 bg-muted rounded w-1/4" />
                </div>
                <div className="h-6 w-20 bg-muted rounded-lg" />
                <div className="h-6 w-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-20 text-center">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No hay mantenciones</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters || activeTab !== 'all' ? 'Prueba con otros filtros' : 'Crea tu primera mantención para comenzar'}
            </p>
            {!hasFilters && activeTab === 'all' && canCreate && (
              <Button onClick={handleNew} className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Nueva Mantención
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[10px_2fr_1fr_1fr_1.2fr_1.2fr_110px] items-center gap-4 px-5 py-3 bg-muted/40 border-b border-border">
              <span />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Mantención</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sistema</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tipo / Frecuencia</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Próx. Ejecución</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Responsable</span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">Acciones</span>
            </div>

            <div className="divide-y divide-border">
              {filtered.map(m => {
                const urgency = getUrgency(m);
                const urg = URGENCY[urgency];
                const days = m.next_execution ? differenceInDays(new Date(m.next_execution), new Date()) : null;

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "group flex flex-col md:grid md:grid-cols-[10px_2fr_1fr_1fr_1.2fr_1.2fr_110px] items-center gap-3 md:gap-4 px-5 py-4 hover:bg-accent/40 transition-colors",
                      urgency === 'overdue' && "border-l-[3px] border-l-red-400"
                    )}
                  >
                    {/* Status dot */}
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 hidden md:block", urg.dot)} />

                    {/* Name */}
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("h-2 w-2 rounded-full shrink-0 md:hidden", urg.dot)} />
                          <Link
                            to={`/maintenances/${m.id}`}
                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                          >
                            {m.name}
                          </Link>
                          {urg.label && (
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0", urg.badge)}>
                              {urg.label.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{m.community_name || '—'}</p>
                      </div>
                    </div>

                    {/* Sistema */}
                    <div>
                      {m.system_type ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{SYSTEM_ICONS[m.system_type] || '🔧'}</span>
                          <span className="text-xs text-muted-foreground">{SYSTEM_LABELS[m.system_type]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Tipo / Frecuencia */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border", TYPE_STYLES[m.type])}>
                        {m.type === 'preventiva' ? 'Preventiva' : 'Correctiva'}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {FREQ_LABELS[m.frequency]}
                      </span>
                    </div>

                    {/* Próxima ejecución */}
                    <div>
                      {m.next_execution ? (
                        <div>
                          <p className={cn(
                            "text-sm font-semibold",
                            urgency === 'overdue' ? 'text-red-600' : urgency === 'soon' ? 'text-amber-600' : 'text-foreground'
                          )}>
                            {format(new Date(m.next_execution), "d MMM yyyy", { locale: es })}
                          </p>
                          <p className={cn("text-xs", days !== null && days < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                            {days === null ? '' : days < 0 ? `Hace ${Math.abs(days)}d` : days === 0 ? 'Hoy' : `En ${days}d`}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Responsable */}
                    <div className="flex items-center gap-2">
                      {m.assigned_to_name ? (
                        <>
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">
                              {m.assigned_to_name[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-foreground truncate font-medium">{m.assigned_to_name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">Sin asignar</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-0.5 shrink-0">
                      <button
                        onClick={() => toggleMutation.mutate({ id: m.id, active: !m.active })}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          m.active
                            ? "hover:bg-emerald-50 text-emerald-600"
                            : "hover:bg-slate-100 text-slate-400"
                        )}
                        title={m.active ? 'Desactivar' : 'Activar'}
                      >
                        {m.active
                          ? <ToggleRight className="h-4 w-4" />
                          : <ToggleLeft className="h-4 w-4" />
                        }
                      </button>
                      <Link
                        to={`/maintenances/${m.id}`}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleEdit(m)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm('¿Eliminar esta mantención?')) deleteMutation.mutate(m.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{filtered.length}</span> de{' '}
                <span className="font-semibold text-foreground">{maintenances.length}</span> mantenciones
              </p>
              {counts.overdue > 0 && (
                <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {counts.overdue} vencida{counts.overdue !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}

        <MaintenanceFormDialog open={formOpen} onOpenChange={setFormOpen} maintenance={editing} />
      </div>
    </PermissionGate>
  );
}