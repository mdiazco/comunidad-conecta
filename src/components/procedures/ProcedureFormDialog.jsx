import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProcedureFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({
    community_id: '', name: '', procedure_type: 'documento', classification: 'administrativo',
    description: '', flow_steps: []
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list(),
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      let file_url = '';
      if (file) {
        setUploading(true);
        const result = await base44.integrations.Core.UploadFile({ file });
        file_url = result.file_url;
        setUploading(false);
      }
      return base44.entities.Procedure.create({ ...data, file_url: file_url || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      onOpenChange(false);
      setForm({ community_id: '', name: '', procedure_type: 'documento', classification: 'administrativo', description: '', flow_steps: [] });
      setFile(null);
      toast.success('Procedimiento creado');
    },
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const addStep = () => {
    set('flow_steps', [...form.flow_steps, { step_number: form.flow_steps.length + 1, title: '', description: '' }]);
  };

  const updateStep = (index, field, value) => {
    const steps = [...form.flow_steps];
    steps[index] = { ...steps[index], [field]: value };
    set('flow_steps', steps);
  };

  const removeStep = (index) => {
    set('flow_steps', form.flow_steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo Procedimiento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Comunidad *</Label>
            <Select value={form.community_id} onValueChange={v => set('community_id', v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.procedure_type} onValueChange={v => set('procedure_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="documento">Documento</SelectItem>
                  <SelectItem value="flujo">Flujo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clasificación *</Label>
              <Select value={form.classification} onValueChange={v => set('classification', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="seguridad">Seguridad</SelectItem>
                  <SelectItem value="emergencia">Emergencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
          </div>

          {form.procedure_type === 'documento' && (
            <div>
              <Label>Archivo PDF</Label>
              <Input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} />
            </div>
          )}

          {form.procedure_type === 'flujo' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pasos del flujo</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" /> Paso
                </Button>
              </div>
              {form.flow_steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 p-3 border rounded-lg">
                  <span className="text-xs font-bold text-muted-foreground mt-2">{step.step_number}</span>
                  <div className="flex-1 space-y-2">
                    <Input placeholder="Título del paso" value={step.title} onChange={e => updateStep(i, 'title', e.target.value)} />
                    <Input placeholder="Descripción" value={step.description} onChange={e => updateStep(i, 'description', e.target.value)} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeStep(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || uploading || !form.community_id || !form.name}>
              {(mutation.isPending || uploading) ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : 'Crear'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}