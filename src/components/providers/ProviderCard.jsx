import React from 'react';
import { Star, Wrench, Phone, Mail, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SERVICE_LABELS = {
  ascensores: 'Ascensores', gas: 'Gas', aseo: 'Aseo', electricidad: 'Electricidad',
  plomeria: 'Plomería', jardineria: 'Jardinería', seguridad: 'Seguridad',
  climatizacion: 'Climatización', pintura: 'Pintura', otro: 'Otro',
};

function ScoreBar({ score }) {
  const pct = ((score - 1) / 4) * 100;
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-amber-500" : "bg-red-500")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ProviderCard({ provider, onClick, onEdit }) {
  const score = provider.avg_score;
  const hasScore = score != null && !isNaN(score);
  const isLow = hasScore && score < 3;
  const isGood = hasScore && score >= 4;
  const isMed = hasScore && score >= 3 && score < 4;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group",
        isLow ? "border-red-200" : isGood ? "border-emerald-200" : "border-border"
      )}
    >
      {isLow && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-3 px-2 py-1.5 bg-red-50 rounded-lg border border-red-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Bajo desempeño — requiere atención
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            isLow ? "bg-red-100" : isGood ? "bg-emerald-100" : isMed ? "bg-amber-100" : "bg-muted"
          )}>
            <Wrench className={cn("h-5 w-5", isLow ? "text-red-600" : isGood ? "text-emerald-600" : isMed ? "text-amber-600" : "text-muted-foreground")} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{provider.name}</p>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md inline-block mt-0.5">
              {SERVICE_LABELS[provider.service_type] || provider.service_type}
            </span>
          </div>
        </div>

        {hasScore ? (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-lg shrink-0",
            isLow ? "bg-red-50" : isGood ? "bg-emerald-50" : "bg-amber-50"
          )}>
            <Star className={cn("h-4 w-4", isLow ? "text-red-500" : isGood ? "text-emerald-500" : "text-amber-500")} fill="currentColor" />
            <span className={cn("text-lg font-bold", isLow ? "text-red-600" : isGood ? "text-emerald-600" : "text-amber-600")}>
              {Number(score).toFixed(1)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">Sin evaluar</span>
        )}
      </div>

      {hasScore && <ScoreBar score={score} />}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <BarChart2 className="h-3.5 w-3.5" />
          {provider.total_evaluations || 0} evaluación{(provider.total_evaluations || 0) !== 1 ? 'es' : ''}
        </div>
        {provider.contact_phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {provider.contact_phone}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex justify-end gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
        >
          Editar
        </button>
      </div>
    </div>
  );
}