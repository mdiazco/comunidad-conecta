import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, FileText, AlertTriangle, DollarSign, Calendar, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import ContractFormDialog from '@/components/contracts/ContractFormDialog';
import { toast } from 'sonner';

const STATUS_STYLES = {
  activo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  vencido: 'bg-red-50 text-red-700 border-red-200',
  suspendido: 'bg-slate-50 text-slate-600 border-slate-200',
  por_renovar: 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_LABELS = {
  activo: 'Activo', vencido: 'Vencido', suspendido: 'Suspendido', por_renovar: 'Por renovar',
};

const SERVICE_LABELS = {
  ascensores: 'Ascensores', gas: 'Gas', aseo: 'Aseo', electricidad: 'Electricidad',
  plomeria: 'Plomería', jardineria: 'Jardinería', seguridad: 'Seguridad',
  climatizacion: 'Climatización', pintura: 'Pintura', otro: 'Otro',
};

function formatCost(amount, currency = 'CLP') {
  if (!amount) return '—';
  if (currency === 'CLP') return `$${Number(amount).toLocaleString('es-CL')}`;
  if (currency === 'UF') return `${Number(amount).toFixed(2)} UF`;
  return `USD ${Number(amount).toLocaleString()}`;
}

export default function Contracts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Contract.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contracts'] }); toast.success('Contrato eliminado'); },
  });

  // Auto-update status based on end_date
  const enriched = contracts.map(c => {
    const days = c.end_date ? differenceInDays(new Date(c.end_date), new Date()) : null;
    let computedStatus = c.status;
    if (days !== null && days < 0 && c.status === 'activo') computedStatus = 'vencido';
    else if (days !== null && days <= 30 && days >= 0 && c.status === 'activo') computedStatus = 'por_renovar';
    return { ...c, computedStatus, daysLeft: days };
  });

  const filtered = enriched.filter(c => {
    const matchSearch = !search ||
      c.provider_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.community_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.service_description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.computedStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalMonthlyCost = enriched
    .filter(c => c.computedStatus === 'activo' || c.computedStatus === 'por_renovar')
    .filter(c => c.currency === 'CLP')
    .reduce((s, c) => s + (c.monthly_cost || 0), 0);

  const expiring = enriched.filter(c => c.computedStatus === 'por_renovar').length;
  const expired = enriched.filter(c => c.computedStatus === 'vencido').length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de contratos con proveedores, costos y vencimientos</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nuevo Contrato
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total contratos', value: contracts.length, icon: FileText, color: 'text-foreground', bg: 'bg-card' },
          { label: 'Costo mensual (CLP)', value: `$${totalMonthlyCost.toLocaleString('es-CL')}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Por renovar', value: expiring, icon: Calendar, color: expiring > 0 ? 'text-amber-600' : 'text-muted-foreground', bg: expiring > 0 ? 'bg-amber-50' : 'bg-card' },
          { label: 'Vencidos', value: expired, icon: AlertTriangle, color: expired > 0 ? 'text-red-600' : 'text-muted-foreground', bg: expired > 0 ? 'bg-red-50' : 'bg-card' },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl p-4 border border-border", s.bg)}>
            <div className="flex items-center gap-2 mb-1"><s.icon className={cn("h-4 w-4", s.color)} /></div>
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {expiring > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{expiring}</strong> contrato{expiring !== 1 ? 's' : ''} vence{expiring === 1 ? '' : 'n'} en los próximos 30 días. Revisar renovación.</span>
        </div>
      )}
      {expired > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{expired}</strong> contrato{expired !== 1 ? 's' : ''} vencido{expired !== 1 ? 's' : ''}. Gestionar renovación o reemplazo urgente.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por proveedor o servicio..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'activo', label: 'Activos' },
            { value: 'por_renovar', label: 'Por renovar' },
            { value: 'vencido', label: 'Vencidos' },
          ].map(f => (
            <button key={f.value} onClick={() => setFilterStatus(f.value)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterStatus === f.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-card border rounded-xl divide-y">
          {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-muted/30 m-2 rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No hay contratos</h3>
          <p className="text-sm text-muted-foreground mt-1">{search ? 'Prueba con otro término' : 'Registra el primer contrato con un proveedor'}</p>
          {!search && <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Nuevo Contrato</Button>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 bg-muted/40 border-b border-border">
            {['Proveedor / Servicio', 'Tipo', 'Vigencia', 'Costo Mensual', 'Estado', ''].map(h => (
              <span key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</span>
            ))}
          </div>
          <div className="divide-y divide-border">
            {filtered.map(c => (
              <div key={c.id} className="group flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 md:gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
                <div className="min-w-0 w-full">
                  <p className="text-sm font-semibold text-foreground truncate">{c.provider_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.community_name} · {c.service_description || SERVICE_LABELS[c.service_type]}</p>
                </div>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-md">{SERVICE_LABELS[c.service_type] || c.service_type}</span>
                <div>
                  {c.end_date && (
                    <p className={cn("text-xs", c.computedStatus === 'vencido' ? 'text-red-600 font-semibold' : c.computedStatus === 'por_renovar' ? 'text-amber-600 font-semibold' : 'text-foreground')}>
                      {format(new Date(c.end_date), "d MMM yyyy", { locale: es })}
                    </p>
                  )}
                  {c.daysLeft !== null && (
                    <p className="text-xs text-muted-foreground">
                      {c.daysLeft < 0 ? `Venció hace ${Math.abs(c.daysLeft)}d` : c.daysLeft === 0 ? 'Vence hoy' : `${c.daysLeft}d restantes`}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">{formatCost(c.monthly_cost, c.currency)}</p>
                <Badge variant="outline" className={cn("text-xs shrink-0", STATUS_STYLES[c.computedStatus])}>
                  {STATUS_LABELS[c.computedStatus] || c.computedStatus}
                </Badge>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(c); setFormOpen(true); }} className="p-1.5 rounded hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => { if (confirm('¿Eliminar este contrato?')) deleteMutation.mutate(c.id); }} className="p-1.5 rounded hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-muted/30 border-t">
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{filtered.length}</span> contrato{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      <ContractFormDialog open={formOpen} onOpenChange={setFormOpen} contract={editing} />
    </div>
  );
}