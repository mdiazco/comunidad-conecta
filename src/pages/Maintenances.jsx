import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Wrench, CalendarClock, CheckCircle2,
  AlertTriangle, Clock, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronRight
} from 'lucide-react';
import { SYSTEM_LABELS, SYSTEM_ICONS, getCurrentYear } from '@/lib/expertChecklists';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import MaintenanceFormDialog from '@/components/maintenance/MaintenanceFormDialog';
import { toast } from 'sonner';

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
  overdue:  { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',       label: 'Vencida' },
  soon:     { dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Próxima' },
  ok:       { dot: 'bg-emerald-500',badge: '',                                              label: '' },
  inactive: { dot: 'bg-slate-300',  badge: '',                                              label: '' },
};

export default function Maintenances() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterYear, setFilterYear] = useState(String(getCurrentYear()));
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

  const filtered = maintenances.filter(m => {
    const matchSearch = !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.community_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || m.type === filterType;
    const matchYear = filterYear === 'all' || String(m.year || getCurrentYear()) === filterYear;
    return matchSearch && matchType && matchYear;
  });

  const currentYear = getCurrentYear();
  const years = [...new Set(maintenances.map(m => m.year || currentYear))].sort((a, b) => b - a);

  const overdue = maintenances.filter(m => getUrgency(m) === 'overdue').length;
  const soon    = maintenances.filter(m => getUrgency(m) === 'soon').length;
  const active  = maintenances.filter(m => m.active).length;

  const handleEdit = (m) => { setEditing(m); setFormOpen(true); };
  const handleNew  = () => { setEditing(null); setFormOpen(true); };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mantenciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planifica y automatiza las mantenciones preventivas y correctivas de tu comunidad.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 shadow-sm shrink-0">
          <Plus className="h-4 w-4" /> Nueva Mantención
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: maintenances.length, color: 'border-border',      text: 'text-foreground' },
          { label: 'Activas',  value: active,              color: 'border-emerald-200',  text: 'text-emerald-600' },
          { label: 'Vencidas', value: overdue,             color: 'border-red-200',      text: 'text-red-600' },
          { label: 'Próximas (7d)', value: soon,           color: 'border-amber-200',    text: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className={cn("bg-card border rounded-xl p-4", s.color)}>
            <p className={cn("text-3xl font-bold", s.text)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {overdue > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{overdue}</strong> mantención{overdue !== 1 ? 'es' : ''} vencida{overdue !== 1 ? 's' : ''} sin ejecutar.</span>
        </div>
      )}
      {soon > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <Clock className="h-4 w-4 shrink-0" />
          <span><strong>{soon}</strong> mantención{soon !== 1 ? 'es' : ''} próxima{soon !== 1 ? 's' : ''} en los próximos 7 días.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o comunidad..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'preventiva', label: 'Preventiva' },
            { value: 'correctiva', label: 'Correctiva' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterType === f.value
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >{f.label}</button>
          ))}
          <div className="h-5 w-px bg-border mx-1 self-center" />
          <button onClick={() => setFilterYear('all')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filterYear === 'all' ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>Todos los años</button>
          {years.map(y => (
            <button key={y} onClick={() => setFilterYear(String(y))} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filterYear === String(y) ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>{y}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-4 px-5 py-4 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 bg-muted rounded w-1/3" />
                <div className="h-2.5 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
            <Wrench className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No hay mantenciones</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Prueba con otro término de búsqueda' : 'Crea tu primera mantención para comenzar'}
          </p>
          {!search && (
            <Button onClick={handleNew} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Nueva Mantención</Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-4 px-5 py-2.5 bg-muted/40 border-b border-border">
            {['Mantención', 'Tipo / Frecuencia', 'Próx. Ejecución', 'Responsable', ''].map(h => (
              <span key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-border">
            {filtered.map(m => {
              const urgency = getUrgency(m);
              const urg = URGENCY[urgency];
              const days = m.next_execution ? differenceInDays(new Date(m.next_execution), new Date()) : null;

              return (
                <div key={m.id} className="group flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1.5fr_auto] items-center gap-3 md:gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
                  {/* Name */}
                  <div className="flex items-center gap-3 w-full">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", urg.dot)} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/maintenances/${m.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block">
                        {m.name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">{m.community_name || '—'}</p>
                    </div>
                    {urg.label && (
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md border shrink-0", urg.badge)}>
                        {urg.label}
                      </span>
                    )}
                    {!m.active && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md border bg-slate-50 text-slate-500 border-slate-200 shrink-0">
                        Inactiva
                      </span>
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
                        <p className={cn("text-sm font-medium", urgency === 'overdue' ? 'text-red-600' : urgency === 'soon' ? 'text-amber-600' : 'text-foreground')}>
                          {format(new Date(m.next_execution), "d MMM yyyy", { locale: es })}
                        </p>
                        <p className={cn("text-xs", days !== null && days < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                          {days === null ? '' : days < 0 ? `Hace ${Math.abs(days)} días` : days === 0 ? 'Hoy' : `En ${days} días`}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Responsable */}
                  <div>
                    {m.assigned_to_name ? (
                      <p className="text-sm text-foreground truncate">{m.assigned_to_name}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 italic">Sin asignar</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleMutation.mutate({ id: m.id, active: !m.active })}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title={m.active ? 'Desactivar' : 'Activar'}
                    >
                      {m.active
                        ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                        : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>
                    <button onClick={() => handleEdit(m)} className="p-1.5 rounded hover:bg-muted transition-colors">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => { if (confirm('¿Eliminar esta mantención?')) deleteMutation.mutate(m.id); }}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                    <Link to={`/maintenances/${m.id}`} className="p-1.5 rounded hover:bg-muted transition-colors">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span> mantención{filtered.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      )}

      <MaintenanceFormDialog open={formOpen} onOpenChange={setFormOpen} maintenance={editing} />
    </div>
  );
}