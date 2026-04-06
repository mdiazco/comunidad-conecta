import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';

function formatCLP(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

const STATUS_LABELS = {
  creada: 'Creada',
  pendiente_presupuestos: 'Pend. presupuestos',
  en_evaluacion: 'En evaluación',
  pendiente_aprobacion_comite: 'VoBo Admin – Pend. Comité',
  en_votacion_comite: 'En votación Comité',
  aprobado_comite: 'Aprobado por Comité',
  rechazado_comite: 'Rechazado por Comité',
  pendiente_aprobacion_admin: 'Pend. aprobación Admin',
  aprobado_final: 'Aprobado Final',
  rechazado_final: 'Rechazado Final',
  asignada: 'Asignada',
  en_ejecucion: 'En ejecución',
  finalizada: 'Finalizada',
  observada: 'Observada',
};

const PRIORITY_LABELS = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const TYPE_LABELS = { reparacion: 'Reparación', preventiva: 'Preventiva', emergencia: 'Emergencia', administrativa: 'Administrativa' };
const VOTE_LABELS = { approve: 'Aprobar', reject: 'Rechazar' };

export default function TaskPDFExport({ task }) {
  const [loading, setLoading] = useState(false);

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', task.id],
    queryFn: () => base44.entities.Budget.filter({ task_id: task.id }),
    enabled: !!task.id && task.task_type === 'reparacion',
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['committee-votes', task.id],
    queryFn: () => base44.entities.CommitteeVote.filter({ task_id: task.id }),
    enabled: !!task.id,
  });

  const { data: evidences = [] } = useQuery({
    queryKey: ['evidence', task.id],
    queryFn: () => base44.entities.Evidence.filter({ task_id: task.id }),
    enabled: !!task.id,
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210;
      const margin = 18;
      const contentW = W - margin * 2;
      let y = 0;

      const primaryColor = [37, 99, 235];   // blue-600
      const darkColor    = [15, 23, 42];     // slate-900
      const mutedColor   = [100, 116, 139];  // slate-500
      const lightBg      = [241, 245, 249];  // slate-100
      const successColor = [5, 150, 105];    // emerald-600
      const dangerColor  = [220, 38, 38];    // red-600

      // ── Header band ──────────────────────────────────────────
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, W, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('INFORME DE TAREA', margin, 11);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(task.title, contentW);
      doc.text(titleLines, margin, 20);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado el ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, W - margin, 29, { align: 'right' });
      y = 40;

      // ── Helper functions ──────────────────────────────────────
      const checkPage = (needed = 12) => {
        if (y + needed > 275) { doc.addPage(); y = 18; }
      };

      const sectionTitle = (text) => {
        checkPage(16);
        doc.setFillColor(...lightBg);
        doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
        doc.setTextColor(...primaryColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(text.toUpperCase(), margin + 4, y + 5.5);
        y += 12;
      };

      const row = (label, value, color = darkColor) => {
        checkPage(8);
        doc.setTextColor(...mutedColor);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(label, margin, y);
        doc.setTextColor(...color);
        doc.setFont('helvetica', 'bold');
        const lines = doc.splitTextToSize(String(value || '—'), contentW - 52);
        doc.text(lines, margin + 52, y);
        y += 5 * lines.length + 1;
      };

      const separator = () => {
        checkPage(6);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, W - margin, y);
        y += 5;
      };

      // ── 1. Información General ────────────────────────────────
      sectionTitle('1. Información General');
      row('Comunidad', task.community_name);
      row('Estado', STATUS_LABELS[task.status] || task.status);
      row('Tipo', TYPE_LABELS[task.task_type] || task.task_type);
      row('Prioridad', PRIORITY_LABELS[task.priority] || task.priority);
      row('Responsable Interno', task.assigned_to_name || task.assigned_to);
      row('Proveedor / Contratista', task.supplier_name || task.provider_name);
      row('Fecha comprometida', task.due_date ? format(new Date(task.due_date), "d 'de' MMMM yyyy", { locale: es }) : '—');
      row('Creada el', format(new Date(task.created_date), "d 'de' MMMM yyyy", { locale: es }));
      if (task.started_at) row('Inicio ejecución', format(new Date(task.started_at), "d 'de' MMMM yyyy", { locale: es }));
      if (task.finished_at) row('Finalización', format(new Date(task.finished_at), "d 'de' MMMM yyyy", { locale: es }));
      if (task.description) {
        checkPage(20);
        doc.setTextColor(...mutedColor);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Descripción', margin, y);
        doc.setTextColor(...darkColor);
        const descLines = doc.splitTextToSize(task.description, contentW - 52);
        doc.setFont('helvetica', 'normal');
        doc.text(descLines, margin + 52, y);
        y += 5 * descLines.length + 1;
      }
      separator();

      // ── 2. Presupuestos ───────────────────────────────────────
      if (task.task_type === 'reparacion' && task.requires_budget) {
        sectionTitle('2. Presupuestos Evaluados');
        if (budgets.length === 0) {
          doc.setTextColor(...mutedColor);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.text('Sin presupuestos registrados.', margin, y);
          y += 7;
        } else {
          const sorted = [...budgets].sort((a, b) => a.amount - b.amount);
          const minAmt = sorted[0].amount;
          const maxAmt = sorted[sorted.length - 1].amount;
          const avgAmt = sorted.reduce((s, b) => s + b.amount, 0) / sorted.length;

          sorted.forEach((b, i) => {
            checkPage(22);
            const isSelected = b.is_selected || b.is_approved;
            const bgColor = b.is_approved ? [209, 250, 229] : isSelected ? [219, 234, 254] : [248, 250, 252];
            doc.setFillColor(...bgColor);
            doc.roundedRect(margin, y, contentW, 18, 1.5, 1.5, 'F');

            doc.setTextColor(...darkColor);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`${i + 1}. ${b.supplier_name}`, margin + 4, y + 6);

            const tags = [];
            if (b.amount === minAmt && sorted.length > 1) tags.push('Más barato');
            if (b.amount === maxAmt && sorted.length > 1) tags.push('Más caro');
            if (b.is_approved) tags.push('APROBADO');
            else if (isSelected) tags.push('Seleccionado');
            if (b.id === task.committee_suggested_budget_id) tags.push('Sugerido');
            if (tags.length) {
              doc.setFontSize(7);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...(b.is_approved ? successColor : primaryColor));
              doc.text(tags.join(' · '), margin + 4, y + 11);
            }
            if (b.description) {
              doc.setFontSize(7);
              doc.setTextColor(...mutedColor);
              doc.setFont('helvetica', 'italic');
              const dLines = doc.splitTextToSize(b.description, contentW - 60);
              doc.text(dLines, margin + 4, y + 15);
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...(b.is_approved ? successColor : darkColor));
            doc.text(formatCLP(b.amount), W - margin - 2, y + 8, { align: 'right' });
            const diff = b.amount - avgAmt;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...(diff <= 0 ? successColor : dangerColor));
            doc.text(`${diff <= 0 ? '' : '+'}${formatCLP(Math.round(diff))} vs. promedio`, W - margin - 2, y + 14, { align: 'right' });

            y += 21;
          });

          // Summary row
          checkPage(10);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...mutedColor);
          doc.text(`Promedio: ${formatCLP(Math.round(avgAmt))}   |   Mínimo: ${formatCLP(minAmt)}   |   Máximo: ${formatCLP(maxAmt)}`, margin, y);
          y += 7;
        }

        if (task.selected_budget_supplier && task.status === 'aprobado_final') {
          checkPage(14);
          doc.setFillColor(209, 250, 229);
          doc.roundedRect(margin, y, contentW, 11, 1.5, 1.5, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...successColor);
          doc.text(`✓ Presupuesto aprobado: ${task.selected_budget_supplier} — ${task.selected_budget_amount ? formatCLP(task.selected_budget_amount) : ''}`, margin + 4, y + 7);
          y += 14;
        }

        separator();
      }

      // ── 3. Historial de Votos del Comité ─────────────────────
      const sectionNum = task.task_type === 'reparacion' && task.requires_budget ? '3' : '2';
      sectionTitle(`${sectionNum}. Historial de Votos del Comité`);
      if (votes.length === 0) {
        doc.setTextColor(...mutedColor);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('Sin votos registrados.', margin, y);
        y += 7;
      } else {
        // Totals
        const totalApprove = votes.filter(v => v.vote === 'approve').length;
        const totalReject = votes.filter(v => v.vote === 'reject').length;
        checkPage(10);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text(`Aprobaron: ${totalApprove}`, margin, y);
        doc.setTextColor(...dangerColor);
        doc.text(`Rechazaron: ${totalReject}`, margin + 40, y);
        doc.setTextColor(...mutedColor);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total votantes: ${votes.length}`, margin + 85, y);
        y += 8;

        votes.forEach((v) => {
          checkPage(14);
          const isApprove = v.vote === 'approve';
          doc.setFillColor(...(isApprove ? [240, 253, 244] : [254, 242, 242]));
          doc.roundedRect(margin, y, contentW, 11, 1.5, 1.5, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...(isApprove ? successColor : dangerColor));
          doc.text(isApprove ? '✓' : '✗', margin + 4, y + 7);
          doc.setTextColor(...darkColor);
          doc.text(v.voter_name || v.voter_email, margin + 10, y + 7);
          if (v.comment) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7);
            doc.setTextColor(...mutedColor);
            const cLines = doc.splitTextToSize(`"${v.comment}"`, contentW - 60);
            doc.text(cLines, margin + 10, y + (cLines.length > 1 ? 11 : 7));
          }
          if (v.voted_at) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...mutedColor);
            doc.text(format(new Date(v.voted_at), "d MMM yyyy HH:mm", { locale: es }), W - margin - 2, y + 7, { align: 'right' });
          }
          y += 14;
        });

        if (task.committee_rejection_reason) {
          checkPage(12);
          doc.setFillColor(254, 226, 226);
          doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...dangerColor);
          doc.text('Motivo rechazo comité:', margin + 4, y + 4);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkColor);
          const rLines = doc.splitTextToSize(task.committee_rejection_reason, contentW - 55);
          doc.text(rLines, margin + 50, y + 4);
          y += 13;
        }
      }
      separator();

      // ── 4. Evidencias ─────────────────────────────────────────
      const sectionNum2 = task.task_type === 'reparacion' && task.requires_budget ? '4' : '3';
      sectionTitle(`${sectionNum2}. Evidencias Adjuntas`);
      if (evidences.length === 0) {
        doc.setTextColor(...mutedColor);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('Sin evidencias registradas.', margin, y);
        y += 7;
      } else {
        evidences.forEach((ev, i) => {
          checkPage(14);
          doc.setFillColor(...lightBg);
          doc.roundedRect(margin, y, contentW, 11, 1.5, 1.5, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...darkColor);
          doc.text(`${i + 1}. ${ev.file_name}`, margin + 4, y + 5);
          if (ev.comment) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7);
            doc.setTextColor(...mutedColor);
            doc.text(ev.comment.substring(0, 80), margin + 4, y + 9.5);
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...mutedColor);
          const evDate = format(new Date(ev.created_date), "d MMM yyyy", { locale: es });
          doc.text(`${ev.uploaded_by_name || ''}  ·  ${evDate}`, W - margin - 2, y + 5, { align: 'right' });
          y += 14;
        });
      }

      // ── Footer on each page ───────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...lightBg);
        doc.line(margin, 285, W - margin, 285);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mutedColor);
        doc.text('Comunidad Conecta — Informe confidencial generado automáticamente', margin, 290);
        doc.text(`Pág. ${i} / ${pageCount}`, W - margin, 290, { align: 'right' });
      }

      const filename = `informe-${task.title.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}-${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(filename);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="gap-1.5 shrink-0"
    >
      <FileDown className="h-3.5 w-3.5" />
      {loading ? 'Generando...' : 'Exportar PDF'}
    </Button>
  );
}