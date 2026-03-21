import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Image, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EvidenceList({ taskId }) {
  const { data: evidences = [], isLoading } = useQuery({
    queryKey: ['evidences', taskId],
    queryFn: () => base44.entities.Evidence.filter({ task_id: taskId }, '-created_date'),
    enabled: !!taskId,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Historial de Evidencias ({evidences.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">Cargando...</div>
        ) : evidences.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay evidencias aún</p>
        ) : (
          <div className="space-y-3">
            {evidences.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  {ev.file_type === 'pdf' ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{ev.file_name}</p>
                    <Badge variant="secondary" className="text-xs shrink-0">v{ev.version || 1}</Badge>
                  </div>
                  {ev.comment && <p className="text-xs text-muted-foreground mt-1">{ev.comment}</p>}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{ev.uploaded_by_name || 'Usuario'}</span>
                    <span>•</span>
                    <span>{format(new Date(ev.created_date), "d MMM yyyy HH:mm", { locale: es })}</span>
                  </div>
                </div>
                <a href={ev.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary hover:text-primary/80">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}