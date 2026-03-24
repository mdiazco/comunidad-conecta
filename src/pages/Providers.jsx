import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Star, AlertTriangle, TrendingUp, Award, Clock, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ProviderFormDialog from '@/components/providers/ProviderFormDialog';
import ProviderCard from '@/components/providers/ProviderCard';
import ProviderDetail from '@/components/providers/ProviderDetail';

const SERVICE_LABELS = {
  ascensores: 'Ascensores', gas: 'Gas', aseo: 'Aseo', electricidad: 'Electricidad',
  plomeria: 'Plomería', jardineria: 'Jardinería', seguridad: 'Seguridad',
  climatizacion: 'Climatización', pintura: 'Pintura', otro: 'Otro',
};

export default function Providers() {
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => base44.entities.Provider.list('-avg_score'),
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['provider_scores'],
    queryFn: () => base44.entities.ProviderScore.list('-created_date'),
  });

  const filtered = providers.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchService = filterService === 'all' || p.service_type === filterService;
    return matchSearch && matchService;
  });

  const lowPerformers = providers.filter(p => p.avg_score != null && p.avg_score < 3);
  const topProvider = [...providers].filter(p => p.avg_score != null).sort((a, b) => b.avg_score - a.avg_score)[0];
  const mostPunctual = [...providers].filter(p => p.total_evaluations > 0).sort((a, b) => b.avg_score - a.avg_score)[0];
  const serviceTypes = [...new Set(providers.map(p => p.service_type))];

  const handleEdit = (p) => { setEditing(p); setFormOpen(true); };
  const handleNew = () => { setEditing(null); setFormOpen(true); };

  if (selectedProvider) {
    return <ProviderDetail provider={selectedProvider} scores={scores.filter(s => s.provider_id === selectedProvider.id)} onBack={() => setSelectedProvider(null)} onEdit={() => { setEditing(selectedProvider); setFormOpen(true); }} />;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-1">Ranking y scoring objetivo de desempeño</p>
        </div>
        <Button onClick={handleNew} className="gap-2 shadow-sm shrink-0">
          <Plus className="h-4 w-4" /> Nuevo Proveedor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total proveedores', value: providers.length, icon: BarChart2, color: 'text-foreground', bg: 'bg-muted/40' },
          { label: 'Score promedio', value: providers.filter(p => p.avg_score).length > 0
              ? (providers.filter(p => p.avg_score).reduce((s, p) => s + p.avg_score, 0) / providers.filter(p => p.avg_score).length).toFixed(1)
              : '—',
            icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Evaluaciones', value: scores.length, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Bajo desempeño', value: lowPerformers.length, icon: AlertTriangle, color: lowPerformers.length > 0 ? 'text-red-600' : 'text-muted-foreground', bg: lowPerformers.length > 0 ? 'bg-red-50' : 'bg-muted/40' },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl p-4 border border-border", s.bg)}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Insights */}
      {(topProvider || lowPerformers.length > 0) && (
        <div className="grid sm:grid-cols-3 gap-3">
          {topProvider && (
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Award className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-emerald-700 font-medium">Mejor proveedor</p>
                <p className="text-sm font-bold text-emerald-800 truncate">{topProvider.name}</p>
                <p className="text-xs text-emerald-600">⭐ {Number(topProvider.avg_score).toFixed(1)}/5</p>
              </div>
            </div>
          )}
          {mostPunctual && mostPunctual.id !== topProvider?.id && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <Clock className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-blue-700 font-medium">Más evaluado</p>
                <p className="text-sm font-bold text-blue-800 truncate">{mostPunctual.name}</p>
                <p className="text-xs text-blue-600">{mostPunctual.total_evaluations} evaluaciones</p>
              </div>
            </div>
          )}
          {lowPerformers.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-red-700 font-medium">Alerta de desempeño</p>
                <p className="text-sm font-bold text-red-800">{lowPerformers.length} proveedor{lowPerformers.length !== 1 ? 'es' : ''} con score &lt; 3</p>
                <p className="text-xs text-red-600">Requieren evaluación</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar proveedor..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterService('all')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", filterService === 'all' ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            Todos
          </button>
          {serviceTypes.map(s => (
            <button key={s} onClick={() => setFilterService(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize", filterService === s ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
              {SERVICE_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
            <Star className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No hay proveedores</h3>
          <p className="text-sm text-muted-foreground mt-1">{search ? 'Prueba con otro término' : 'Registra tu primer proveedor para comenzar'}</p>
          {!search && <Button onClick={handleNew} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Nuevo Proveedor</Button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProviderCard
              key={p.id}
              provider={p}
              onClick={() => setSelectedProvider(p)}
              onEdit={() => handleEdit(p)}
            />
          ))}
        </div>
      )}

      <ProviderFormDialog open={formOpen} onOpenChange={setFormOpen} provider={editing} />
    </div>
  );
}