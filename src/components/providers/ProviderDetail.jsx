import React from 'react';
import { ArrowLeft, Star, Clock, CheckCircle2, AlertTriangle, Wrench, Phone, Mail, BarChart2, Pencil, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SERVICE_LABELS = {
  ascensores: 'Ascensores', gas: 'Gas', aseo: 'Aseo', electricidad: 'Electricidad',
  plomeria: 'Plomería', jardineria: 'Jardinería', seguridad: 'Seguridad',
  climatizacion: 'Climatización', pintura: 'Pintura', otro: 'Otro',
};

function ScoreGauge({ value, label }) {
  const pct = value ? ((value - 1) / 4) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-bold", !value ? "text-muted-foreground" : value >= 4 ? "text-emerald-600" : value >= 3 ? "text-amber-600" : "text-red-600")}>
          {value ? value.toFixed(1) : '—'}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", value >= 4 ? "bg-emerald-500" : value >= 3 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProviderDetail({ provider, scores, onBack, onEdit }) {
  const hasScore = provider.avg_score != null;
  const isLow = hasScore && provider.avg_score < 3;
  const isGood = hasScore && provider.avg_score >= 4;

  // Compute per-criteria averages from scores
  const avg = (field) => {
    const vals = scores.filter(s => s[field]).map(s => s[field]);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const avgPunctuality = avg('punctuality');
  const avgQuality = avg('quality');
  const avgChecklist = avg('checklist_compliance');
  const avgObservations = avg('observations_score');

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-3xl">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Proveedores
        </button>
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
      </div>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center shrink-0", isLow ? "bg-red-100" : isGood ? "bg-emerald-100" : "bg-muted")}>
            <Wrench className={cn("h-7 w-7", isLow ? "text-red-600" : isGood ? "text-emerald-600" : "text-muted-foreground")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{provider.name}</h1>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">{SERVICE_LABELS[provider.service_type] || provider.service_type}</span>
              {!provider.status || provider.status === 'inactive' ? (
                <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">Inactivo</span>
              ) : null}
            </div>
            {isLow && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
                <AlertTriangle className="h-3.5 w-3.5" /> Proveedor con bajo desempeño
              </div>
            )}
          </div>
          {hasScore && (
            <div className={cn("flex flex-col items-center px-4 py-2 rounded-xl", isLow ? "bg-red-50" : isGood ? "bg-emerald-50" : "bg-amber-50")}>
              <Star className={cn("h-5 w-5 mb-0.5", isLow ? "text-red-500" : isGood ? "text-emerald-500" : "text-amber-500")} fill="currentColor" />
              <span className={cn("text-3xl font-bold", isLow ? "text-red-600" : isGood ? "text-emerald-600" : "text-amber-600")}>{Number(provider.avg_score).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">/5</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
          {provider.contact_name && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div><p className="text-xs text-muted-foreground">Contacto</p><p className="text-sm font-medium">{provider.contact_name}</p></div>
            </div>
          )}
          {provider.contact_phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div><p className="text-xs text-muted-foreground">Teléfono</p><p className="text-sm font-medium">{provider.contact_phone}</p></div>
            </div>
          )}
          {provider.contact_email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium truncate">{provider.contact_email}</p></div>
            </div>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      {scores.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Desglose de Criterios</h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{scores.length} evaluación{scores.length !== 1 ? 'es' : ''}</span>
          </div>
          <div className="space-y-3">
            <ScoreGauge value={avgPunctuality} label="⏱️ Puntualidad" />
            <ScoreGauge value={avgQuality} label="✅ Calidad del trabajo" />
            <ScoreGauge value={avgChecklist} label="📋 Cumplimiento checklist" />
            <ScoreGauge value={avgObservations} label="⚠️ Manejo de observaciones" />
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Historial de Evaluaciones</h2>
        </div>
        {scores.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Sin evaluaciones aún</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[...scores].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(s => (
              <div key={s.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.task_title || 'Sin tarea'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(s.created_date), "d 'de' MMMM yyyy", { locale: es })}
                      {s.evaluated_by_name && ` · ${s.evaluated_by_name}`}
                    </p>
                    {s.comment && <p className="text-xs text-muted-foreground italic mt-1">"{s.comment}"</p>}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg shrink-0",
                    s.final_score >= 4 ? "bg-emerald-50" : s.final_score >= 3 ? "bg-amber-50" : "bg-red-50"
                  )}>
                    <Star className={cn("h-3.5 w-3.5", s.final_score >= 4 ? "text-emerald-500" : s.final_score >= 3 ? "text-amber-500" : "text-red-500")} fill="currentColor" />
                    <span className={cn("text-sm font-bold", s.final_score >= 4 ? "text-emerald-600" : s.final_score >= 3 ? "text-amber-600" : "text-red-600")}>
                      {Number(s.final_score).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[
                    { label: 'Puntualidad', val: s.punctuality },
                    { label: 'Calidad', val: s.quality },
                    { label: 'Checklist', val: s.checklist_compliance },
                    { label: 'Observ.', val: s.observations_score },
                  ].map(c => (
                    <div key={c.label} className="text-center bg-muted/40 rounded-lg py-1.5">
                      <p className={cn("text-sm font-bold", c.val >= 4 ? "text-emerald-600" : c.val >= 3 ? "text-amber-600" : "text-red-600")}>{c.val}</p>
                      <p className="text-[10px] text-muted-foreground">{c.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}