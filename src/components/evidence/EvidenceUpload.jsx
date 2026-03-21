import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EvidenceUpload({ taskId, communityId, userName }) {
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: existingEvidences = [] } = useQuery({
    queryKey: ['evidences', taskId],
    queryFn: () => base44.entities.Evidence.filter({ task_id: taskId }),
    enabled: !!taskId,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const ext = file.name.split('.').pop().toLowerCase();
    const version = existingEvidences.length + 1;

    await base44.entities.Evidence.create({
      task_id: taskId,
      community_id: communityId,
      file_url,
      file_name: file.name,
      file_type: ['jpg','jpeg'].includes(ext) ? 'jpg' : ext === 'png' ? 'png' : 'pdf',
      version,
      comment,
      uploaded_by_name: userName,
    });

    queryClient.invalidateQueries({ queryKey: ['evidences', taskId] });
    setFile(null);
    setComment('');
    setUploading(false);
    toast.success('Evidencia subida correctamente');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Subir Evidencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={e => setFile(e.target.files[0])}
        />
        <Textarea
          placeholder="Comentario (opcional)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
        />
        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subiendo...</> : 'Subir Evidencia'}
        </Button>
      </CardContent>
    </Card>
  );
}