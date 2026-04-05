import React from 'react';
import { CheckCircle2, Clock, XCircle, UserCheck, Users, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Visual stepper showing the multi-level approval flow for budget tasks.
 * Steps: Evaluación → Visto Bueno Admin → Votación Comité → Aprobación Final Admin
 */
const STEPS = [
  {
    key: 'evaluacion',
    label: 'Evaluación',
    sublabel: 'Admin evalúa presupuestos',
    icon: UserCheck,
    activeStatuses: ['en_evaluacion'],
    doneStatuses: [
      'pendiente_aprobacion_comite', 'en_votacion_comite', 'aprobado_comite',
      'rechazado_comite', 'pendiente_aprobacion_admin', 'aprobado_final', 'rechazado_final',
    ],
    rejectedStatuses: [],
  },
  {
    key: 'comite',
    label: 'Votación Comité',
    sublabel: 'Miembros votan el presupuesto',
    icon: Users,
    activeStatuses: ['pendiente_aprobacion_comite', 'en_votacion_comite'],
    doneStatuses: ['aprobado_comite', 'pendiente_aprobacion_admin', 'aprobado_final'],
    rejectedStatuses: ['rechazado_comite'],
  },
  {
    key: 'admin_final',
    label: 'Aprobación Final',
    sublabel: 'Admin confirma o veta',
    icon: ShieldCheck,
    activeStatuses: ['pendiente_aprobacion_admin'],
    doneStatuses: ['aprobado_final'],
    rejectedStatuses: ['rechazado_final'],
  },
];

function formatDate(iso) {
  if (!iso) return null;
  try { return format(new Date(iso), "d MMM yyyy", { locale: es }); } catch { return null; }
}

export default function ApprovalFlowPanel({ task }) {
  const { status } = task;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Flujo de Aprobación Multinivel</h3>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-start gap-0">
          {STEPS.map((step, i) => {
            const isDone = step.doneStatuses.includes(status);
            const isActive = step.activeStatuses.includes(status);
            const isRejected = step.rejectedStatuses.includes(status);
            const StepIcon = step.icon;

            // Determine connector color to next step
            const nextStep = STEPS[i + 1];
            const connectorDone = nextStep
              ? [...nextStep.activeStatuses, ...nextStep.doneStatuses, ...nextStep.rejectedStatuses].some(s =>
                  [...step.doneStatuses].includes(status) || nextStep.activeStatuses.includes(status) || nextStep.doneStatuses.includes(status)
                )
              : false;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center flex-1 min-w-0">
                  {/* Circle */}
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                    isRejected
                      ? "bg-red-50 border-red-400 text-red-600"
                      : isDone
                        ? "bg-primary border-primary text-white"
                        : isActive
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted border-border text-muted-foreground"
                  )}>
                    {isRejected
                      ? <XCircle className="h-4 w-4" />
                      : isDone
                        ? <CheckCircle2 className="h-4 w-4" />
                        : isActive
                          ? <Clock className="h-4 w-4 animate-pulse" />
                          : <StepIcon className="h-4 w-4" />
                    }
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-center px-1">
                    <p className={cn(
                      "text-xs font-semibold leading-tight",
                      isRejected ? "text-red-600" : isDone || isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">
                      {step.sublabel}
                    </p>
                    {/* Status hints */}
                    {isActive && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        Activo
                      </span>
                    )}
                    {isDone && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completado
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                        Rechazado
                      </span>
                    )}
                  </div>
                </div>

                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mt-5 mx-1 transition-colors",
                    step.doneStatuses.includes(status) ? "bg-primary" : "bg-border"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Timeline details */}
        <div className="mt-4 pt-4 border-t border-border space-y-1.5">
          {task.committee_sent_at && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Enviado al comité</span>
              <span className="font-medium">{formatDate(task.committee_sent_at)}</span>
            </div>
          )}
          {task.committee_approved_at && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Aprobado por comité</span>
              <span className="font-medium text-emerald-600">{formatDate(task.committee_approved_at)}</span>
            </div>
          )}
          {task.committee_rejection_reason && (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Motivo de rechazo comité</span>
              <span className="text-red-600 italic">"{task.committee_rejection_reason}"</span>
            </div>
          )}
          {task.approved_at && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Aprobación final</span>
              <span className="font-medium text-emerald-600">
                {formatDate(task.approved_at)}
                {task.approved_by_name && ` · ${task.approved_by_name}`}
              </span>
            </div>
          )}
          {task.rejection_reason && (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="text-muted-foreground">Motivo de rechazo</span>
              <span className="text-red-600 italic">"{task.rejection_reason}"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}