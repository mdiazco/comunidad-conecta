import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, Clock, Trophy, Filter, X, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function formatCLP(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

export default function BudgetDashboard() {
  const { user } = useOutletContext();
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-repair'],
    queryFn: () => base44.entities.Task.filter({ task_type: 'reparacion' }),
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['all-budgets'],
    queryFn: () => base44.entities.Budget.list('-created_date', 500),
  });

  // Filters
  const filteredBudgets = budgets.filter(b => {
    if (filterSupplier !== 'all' && b.supplier_name !== filterSupplier) return false;
    if (filterDateFrom && new Date(b.created_date) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(b.created_date) > new Date(filterDateTo)) return false;
    return true;
  });

  const approvedBudgets = filteredBudgets.filter(b => b.is_approved);
  const approvedTasks = tasks.filter(t => t.status === 'aprobada' && t.approved_at && t.created_date);

  // Avg approval time
  const avgApprovalDays = approvedTasks.length > 0
    ? Math.round(approvedTasks.reduce((s, t) => s + differenceInDays(new Date(t.approved_at), new Date(t.created_date)), 0) / approvedTasks.length)
    : null;

  // Supplier ranking
  const supplierMap = {};
  budgets.forEach(b => {
    if (!supplierMap[b.supplier_name]) supplierMap[b.supplier_name] = { name: b.supplier_name, total: 0, selected: 0 };
    supplierMap[b.supplier_name].total++;
    if (b.is_selected || b.is_approved) supplierMap[b.supplier_name].selected++;
  });
  const supplierRanking = Object.values(supplierMap)
    .sort((a, b) => b.selected - a.selected)
    .slice(0, 8);

  // Avg cost per task
  const avgCostApproved = approvedBudgets.length > 0
    ? Math.round(approvedBudgets.reduce((s, b) => s + b.amount, 0) / approvedBudgets.length)
    : null;

  // Price range for approved
  const approvedAmounts = approvedBudgets.map(b => b.amount);
  const priceRange = approvedAmounts.length >= 2
    ? Math.max(...approvedAmounts) - Math.min(...approvedAmounts)
    : null;

  // Savings: approved vs max among task budgets
  const totalSavings = tasks.reduce((sum, t) => {
    if (!t.selected_budget_amount) return sum;
    const taskBudgets = budgets.filter(b => b.task_id === t.id);
    const maxB = Math.max(...taskBudgets.map(b => b.amount));
    return sum + (maxB - t.selected_budget_amount);
  }, 0);

  const uniqueSuppliers = [...new Set(budgets.map(b => b.supplier_name))].filter(Boolean);
  const hasFilters = filterSupplier !== 'all' || filterDateFrom || filterDateTo;

  const statCards = [
    { label: 'Presupuestos totales', value: budgets.length, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Aprobados', value: approvedBudgets.length, icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Promedio aprobado', value: avgCostApproved ? formatCLP(avgCostApproved) : '—', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Tiempo promedio aprobación', value: avgApprovalDays !== null ? `${avgApprovalDays} días` : '—', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <BarChart2 className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Análisis</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Dashboard de Presupuestos</h1>
        <p className="text-sm text-muted-foreground mt-1">Análisis de costos, proveedores y tiempos de aprobación</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl shrink-0', s.bg)}>
              <s.icon className={cn('h-5 w-5', s.color)} />
            </div>
            <div className="min-w-0">
              <p className={cn('text-xl font-extrabold tabular-nums', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Savings highlight */}
      {totalSavings > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Ahorro total por selección inteligente de presupuestos
            </p>
            <p className="text-2xl font-extrabold text-emerald-600">{formatCLP(totalSavings)}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Diferencia entre el presupuesto aprobado y el más caro en cada tarea</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 p-4 bg-card border border-border rounded-2xl">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-semibold">Filtros</span>
        </div>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[180px] h-8 text-sm bg-background">
            <SelectValue placeholder="Proveedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {uniqueSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-sm w-[140px] bg-background" placeholder="Desde" />
        <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-sm w-[140px] bg-background" placeholder="Hasta" />
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
            onClick={() => { setFilterSupplier('all'); setFilterDateFrom(''); setFilterDateTo(''); }}>
            <X className="h-3.5 w-3.5" /> Limpiar
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Supplier ranking */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Ranking de Proveedores</h2>
          {supplierRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {supplierRanking.map((s, idx) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground shrink-0 ml-2">{s.selected}/{s.total} selec.</p>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', idx === 0 ? 'bg-amber-400' : 'bg-primary/60')}
                        style={{ width: `${Math.round((s.selected / Math.max(s.total, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget amounts chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Montos por Proveedor (presupuestos aprobados)</h2>
          {approvedBudgets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin presupuestos aprobados aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={approvedBudgets.slice(0, 10)} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="supplier_name"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [formatCLP(v), 'Monto']} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {approvedBudgets.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={`hsl(${221 + i * 15}, 70%, ${55 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent approved */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Historial de presupuestos aprobados</h2>
        </div>
        {approvedBudgets.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No hay presupuestos aprobados aún</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {approvedBudgets.slice(0, 15).map(b => {
              const task = tasks.find(t => t.id === b.task_id);
              return (
                <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                  <Trophy className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{b.supplier_name}</p>
                    {task && <p className="text-xs text-muted-foreground truncate">{task.title}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600">{formatCLP(b.amount)}</p>
                    {b.approved_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(b.approved_at), "d MMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}