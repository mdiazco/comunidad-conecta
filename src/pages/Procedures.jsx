import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, FileText, ArrowRight, Upload, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProcedureFormDialog from '@/components/procedures/ProcedureFormDialog';
import { isSuperAdmin } from '@/lib/permissions';

const CLASS_COLORS = {
  administrativo: 'bg-primary/10 text-primary',
  mantenimiento: 'bg-amber-100 text-amber-700',
  seguridad: 'bg-red-100 text-red-700',
  emergencia: 'bg-violet-100 text-violet-700',
};

export default function Procedures() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ['procedures'],
    queryFn: () => base44.entities.Procedure.list('-created_date'),
  });

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list(),
  });

  const communityMap = {};
  communities.forEach(c => { communityMap[c.id] = c.name; });

  const filtered = procedures.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || p.procedure_type === typeFilter;
    return matchSearch && matchType;
  });

  const documents = filtered.filter(p => p.procedure_type === 'documento');
  const flows = filtered.filter(p => p.procedure_type === 'flujo');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Procedimientos Operativos</h1>
          <p className="text-muted-foreground">Documentos de referencia y flujos de tareas</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Procedimiento
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar procedimiento..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({filtered.length})</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
          <TabsTrigger value="flows">Flujos ({flows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ProcedureGrid procedures={filtered} communityMap={communityMap} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <ProcedureGrid procedures={documents} communityMap={communityMap} />
        </TabsContent>
        <TabsContent value="flows" className="mt-4">
          <ProcedureGrid procedures={flows} communityMap={communityMap} />
        </TabsContent>
      </Tabs>

      <ProcedureFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function ProcedureGrid({ procedures, communityMap }) {
  if (procedures.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No hay procedimientos</h3>
      </Card>
    );
  }
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {procedures.map(p => (
        <Card key={p.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="secondary" className={`capitalize ${CLASS_COLORS[p.classification] || ''}`}>
              {p.classification}
            </Badge>
            <Badge variant="outline">
              {p.procedure_type === 'documento' ? 'Documento' : 'Flujo'}
            </Badge>
          </div>
          <h3 className="font-medium text-sm mt-2">{p.name}</h3>
          {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
          <p className="text-xs text-muted-foreground mt-2">{communityMap[p.community_id] || ''}</p>
          {p.file_url && (
            <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
              <ExternalLink className="h-3 w-3" /> Ver documento
            </a>
          )}
          {p.flow_steps && p.flow_steps.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">{p.flow_steps.length} pasos</p>
          )}
        </Card>
      ))}
    </div>
  );
}