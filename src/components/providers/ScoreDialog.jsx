import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Star, Clock, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

function StarRating({ value, onChange, label, icon: Icon, description }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm">{label}</Label>
      </div>
      {description && <p className="text-xs text-muted-foreground pl-6">{description}</p>}
      <div className="flex gap-1.5 pl-6">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-9 w-9 rounded-lg border-2 text-sm font-bold transition-all",
              value >= n
                ? n <= 2 ? "border-red-400 bg-red-50 text-red-600"
                  : n <= 3 ? "border-amber-400 bg-amber-50 text-amber-600"
                  : "border-emerald-400 bg-emerald-50 text-emerald-600"
                : "border-border bg-background text-muted-foreground hover:border-primary/40"
            )}
          >
            {n}
          </button>
        ))}
        <span className="ml-2 self-center text-xs text-muted-foreground">
          {value === 1 ? 'Muy malo' : value === 2 ? 'Malo' : value === 3 ? 'Regular' : value === 4 ? 'Bueno' : value === 5 ? 'Excelente' : '—'}
        </span>
      </div>
    </div>
  );
}

export default function ScoreDialog({ open, onOpenChange, task, user }) {
  const queryClient = useQueryClient();
  const [providerId, setProviderId] = useState('');
  const [scores, setScores] = useState({ punctuality: 0, quality: 0, checklist_compliance: 0, observations_score: 0 });
  const [comment, setComment] = useState('');

  const { data: providers = [] } = useQuery({
    queryKey: ['providers', task?.community_id],
    queryFn: () => base44.entities.Provider.filter({ community_id: task?.community_id, status: 'active' }),
    enabled: !!task?.community_id,
  });

  const setScore = (field, val) => setScores(s => ({ ...s, [field]: val }));

  const finalScore = scores.punctuality && scores.quality && scores.checklist_compliance && scores.observations_score
    ? ((scores.punctuality + scores.quality + scores.checklist_compliance + scores.observations_score) / 4)
    : 0;

  const mutation = useMutation({
    mutationFn: async (data) => {
      const score = await base44.entities.ProviderScore.create(data);
      // Recalculate provider avg
      const allScores = await base44.entities.ProviderScore.filter({ provider_id: providerId });
      const avg = allScores.reduce((s, r) => s + r.final_score, 0) / allScores.length;
      await base44.entities.Provider.update(providerId, {
        avg_score: Math.round(avg * 10) / 10,
        total_evaluations: allScores.length,
      });
      return score;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['provider_scores'] });
      toast.success('Evaluación guardada');
      onOpenChange(false);
    },
    onError: (err) => toast.error('Error: ' + (err?.message || 'intenta de nuevo')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!providerId) { toast.error('Selecciona un proveedor'); return; }
    if (!scores.punctuality || !scores.quality || !scores.checklist_compliance || !scores.observations_score) {
      toast.error('Completa todos los criterios de evaluación'); return;
    }
    const provider = providers.find(p => p.id === providerId);
    mutation.mutate({
      provider_id: providerId,
      provider_name: provider?.name || '',
      task_id: task?.id,
      task_title: task?.title,
      community_id: task?.community_id,
      punctuality: scores.punctuality,
      quality: scores.quality,
      checklist_compliance: scores.checklist_compliance,
      observations_score: scores.observations_score,
      final_score: Math.round(finalScore * 10) / 10,
      comment,
      evaluated_by: user?.email,
      evaluated_by_name: user?.full_name || user?.email,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluar Proveedor</DialogTitle>
          {task && <p className="text-sm text-muted-foreground mt-1">Tarea: <span className="font-medium text-foreground">{task.title}</span></p>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="space-y-1.5">
            <Label>Proveedor <span className="text-red-500">*</span></Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger><SelectValue placeholder="¿Qué proveedor ejecutó este trabajo?" /></SelectTrigger>
              <SelectContent>
                {providers.length === 0
                  ? <SelectItem value="_none" disabled>Sin proveedores registrados</SelectItem>
                  : providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.service_type}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
            <StarRating value={scores.punctuality} onChange={v => setScore('punctuality', v)} label="Puntualidad" icon={Clock} description="¿Cumplió con las fechas comprometidas?" />
            <StarRating value={scores.quality} onChange={v => setScore('quality', v)} label="Calidad del trabajo" icon={Wrench} description="¿El trabajo fue bien ejecutado?" />
            <StarRating value={scores.checklist_compliance} onChange={v => setScore('checklist_compliance', v)} label="Cumplimiento checklist" icon={CheckCircle2} description="¿Completó todos los pasos del checklist?" />
            <StarRating value={scores.observations_score} onChange={v => setScore('observations_score', v)} label="Manejo de observaciones" icon={AlertTriangle} description="¿Hubo problemas o incidencias? (5 = sin problemas)" />
          </div>

          {finalScore > 0 && (
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border",
              finalScore >= 4 ? "bg-emerald-50 border-emerald-200" : finalScore >= 3 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
            )}>
              <span className="text-sm font-semibold">Score final</span>
              <div className="flex items-center gap-2">
                <Star className={cn("h-5 w-5", finalScore >= 4 ? "text-emerald-500" : finalScore >= 3 ? "text-amber-500" : "text-red-500")} fill="currentColor" />
                <span className={cn("text-2xl font-bold", finalScore >= 4 ? "text-emerald-600" : finalScore >= 3 ? "text-amber-600" : "text-red-600")}>
                  {finalScore.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Comentario (opcional)</Label>
            <Textarea placeholder="Observaciones adicionales sobre el trabajo realizado..." rows={2} value={comment} onChange={e => setComment(e.target.value)} className="resize-none" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Guardar Evaluación'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}