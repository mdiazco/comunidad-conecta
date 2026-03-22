import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Store, Phone, Mail, Building2, CreditCard, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Proveedor eliminado');
    },
  });

  const filtered = suppliers.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.giro?.toLowerCase().includes(search.toLowerCase()) ||
    s.rut?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (s) => { setEditing(s); setFormOpen(true); };
  const handleNew  = () => { setEditing(null); setFormOpen(true); };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Gestiona los proveedores y contratistas de tu comunidad, incluyendo sus datos de contacto y cuenta bancaria para pagos.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 shadow-sm shrink-0 mt-1">
          <Plus className="h-4 w-4" /> Crear Proveedor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-3xl font-bold text-foreground">{suppliers.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Total proveedores</p>
        </div>
        <div className="bg-card border border-emerald-200 rounded-xl p-4">
          <p className="text-3xl font-bold text-emerald-600">{suppliers.filter(s => s.status === 'active').length}</p>
          <p className="text-sm text-muted-foreground mt-1">Activos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-3xl font-bold text-blue-600">{suppliers.filter(s => s.bank_name).length}</p>
          <p className="text-sm text-muted-foreground mt-1">Con datos bancarios</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, giro o RUT..."
            className="pl-8 h-8 text-sm bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 px-5 py-4 border-b border-border last:border-0 animate-pulse">
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
            <Store className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No hay proveedores</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Prueba con otro término' : 'Agrega tu primer proveedor para comenzar'}
          </p>
          {!search && (
            <Button onClick={handleNew} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Crear Proveedor
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 bg-muted/40 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proveedor</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">RUT / Razón Social</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Banco</span>
            <span className="w-16" />
          </div>

          <div className="divide-y divide-border">
            {filtered.map(s => (
              <div key={s.id} className="flex flex-col md:grid md:grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-3 md:gap-4 px-5 py-4 hover:bg-accent/30 transition-colors group">

                {/* Name + giro */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{s.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.giro || '—'}</p>
                  </div>
                </div>

                {/* Contacto */}
                <div className="space-y-0.5 min-w-0">
                  {s.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{s.email}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">{s.phone}</span>
                    </div>
                  )}
                  {!s.email && !s.phone && <span className="text-xs text-muted-foreground/40">—</span>}
                </div>

                {/* RUT / Razón Social */}
                <div className="space-y-0.5">
                  <p className="text-xs text-foreground font-medium">{s.rut || '—'}</p>
                  {s.razon_social && <p className="text-xs text-muted-foreground truncate">{s.razon_social}</p>}
                </div>

                {/* Banco */}
                <div>
                  {s.bank_name ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-foreground font-medium truncate">{s.bank_name}</span>
                      </div>
                      {s.account_type && <p className="text-xs text-muted-foreground">{s.account_type}</p>}
                      {s.account_number && <p className="text-xs text-muted-foreground/60">N° {s.account_number}</p>}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40 italic">Sin datos bancarios</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm('¿Eliminar este proveedor?')) deleteMutation.mutate(s.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span> proveedor{filtered.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      )}

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editing} />
    </div>
  );
}