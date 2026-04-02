import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Trophy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatCLP(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

export default function SendToCommitteeDialog({ open, onOpenChange, task, budgets, user, committeeMembers }) {
  const queryClient = useQueryClient();
  const [suggestedBudgetId, setSuggestedBudgetId] = useState('');

  const sorted = [...budgets].sort((a, b) => a.amount - b.amount);

  const mutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();

      // Notify each committee member (create notifications)
      const notifPromises = committeeMembers.map(member =>
        base44.entities.Notification.create({
          user_email: member.user_email,
          title: 'Nueva votación pendiente',
          message: `Se requiere tu voto para la tarea "${task.title}". Accede a la tarea para votar.`,
          type: 'task_assigned',
          community_id: task.community_id,
          link: `/tasks/${task.id}`,
          read: false,
        })
      );
      await Promise.all(notifPromises);

      // If a budget was selected as suggestion, mark it
      if (suggestedBudgetId) {
        // Deselect all first, then select suggestion
        await Promise.all(budgets.map(b =>
          base44.entities.Budget.update(b.id, { is_selected: b.id === suggestedBudgetId })
        ));
      }

      await base44.entities.Task.update(task.id, {
        status: 'en_votacion_comite',
        committee_sent_at: now,
        committee_sent_by: user.email,
        committee_suggested_budget_id: suggestedBudgetId || undefined,
        committee_votes_approve: 0,
        committee_votes_reject: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', task.id] });
      toast.success(`Enviado a votación — ${committeeMembers.length} miembro(s) del comité notificados`);
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" /> Enviar a votación del Comité
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Committee members */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Miembros del Comité ({committeeMembers.length})
            </p>
            {committeeMembers.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  No hay miembros del Comité asignados a esta comunidad. Asigna miembros con rol "comité" primero.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {committeeMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm">
                    <div className="h-6 w-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-violet-700">
                        {(m.user_name || m.user_email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm">{m.user_name || m.user_email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggest a budget */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Presupuesto sugerido <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
            </Label>
            <Select value={suggestedBudgetId} onValueChange={setSuggestedBudgetId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin sugerencia — el comité decide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Sin sugerencia</SelectItem>
                {sorted.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="flex items-center gap-2">
                      {b.id === sorted[0]?.id && <Trophy className="h-3 w-3 text-emerald-500" />}
                      {b.supplier_name} — {formatCLP(b.amount)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {suggestedBudgetId && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Trophy className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Se indicará al comité que tu recomendación es{' '}
                <strong>{sorted.find(b => b.id === suggestedBudgetId)?.supplier_name}</strong>.
                El comité puede votar libremente de todas formas.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              disabled={mutation.isPending || committeeMembers.length === 0}
              onClick={() => mutation.mutate()}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              <Users className="h-4 w-4" />
              {mutation.isPending ? 'Enviando...' : 'Enviar a Comité'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}