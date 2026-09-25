import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Inbox, UserPlus, CheckCircle2, XCircle, Mail, Phone, IdCard, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  nuevo: { label: 'Nuevo', className: 'bg-blue-100 text-blue-700' },
  contactado: { label: 'Contactado', className: 'bg-amber-100 text-amber-700' },
  autorizado: { label: 'Autorizado', className: 'bg-emerald-100 text-emerald-700' },
  descartado: { label: 'Descartado', className: 'bg-muted text-muted-foreground' },
};

export default function Leads() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
  });

  const authorizeMutation = useMutation({
    mutationFn: async (lead) => {
      // Invita al usuario a la plataforma (rol user) y marca el lead como autorizado
      await base44.users.inviteUser(lead.email, 'user');
      await base44.entities.Lead.update(lead.id, { status: 'autorizado' });
    },
    onSuccess: (_, lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['authorized-leads'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(`Invitación enviada a ${lead.email}`);
    },
    onError: (err, lead) => {
      const msg = err?.response?.data?.error || err?.message || 'No se pudo autorizar.';
      toast.error(`Error para ${lead.email}: ${msg}`);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (lead) => {
      await base44.users.inviteUser(lead.email, 'user');
    },
    onSuccess: (_, lead) => {
      toast.success(`Invitación reenviada a ${lead.email}`);
    },
    onError: (err, lead) => {
      const msg = err?.response?.data?.error || err?.message || 'No se pudo reenviar.';
      toast.error(`Error para ${lead.email}: ${msg}`);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (lead) => base44.entities.Lead.update(lead.id, { status: 'descartado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Solicitud descartada');
    },
  });

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.full_name || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.rut || '').toLowerCase().includes(q)
    );
  });

  const pending = leads.filter((l) => l.status === 'nuevo').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Solicitudes de acceso
            {pending > 0 && (
              <Badge className="bg-primary/10 text-primary">{pending} pendiente{pending > 1 ? 's' : ''}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Interesados que completaron el formulario de registro</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, email o RUT..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-1/2" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No hay solicitudes</h3>
          <p className="text-sm text-muted-foreground">Los registros del formulario público aparecerán aquí.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.nuevo;
            const isBusy = authorizeMutation.isPending && authorizeMutation.variables?.id === lead.id;
            return (
              <Card key={lead.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{lead.full_name}</p>
                      <Badge variant="secondary" className={cfg.className}>{cfg.label}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
                      <span className="flex items-center gap-1"><IdCard className="h-3 w-3" />{lead.rut}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.status !== 'autorizado' && lead.status !== 'descartado' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => authorizeMutation.mutate(lead)}
                          disabled={isBusy}
                        >
                          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                          Autorizar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dismissMutation.mutate(lead)}
                          disabled={dismissMutation.isPending && dismissMutation.variables?.id === lead.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Descartar
                        </Button>
                      </>
                    )}
                    {lead.status === 'autorizado' && (
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Invitación enviada
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendMutation.mutate(lead)}
                          disabled={resendMutation.isPending && resendMutation.variables?.id === lead.id}
                        >
                          {resendMutation.isPending && resendMutation.variables?.id === lead.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Reenviar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}