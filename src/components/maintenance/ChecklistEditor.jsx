import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Generates a simple unique id
const uid = () => Math.random().toString(36).slice(2, 9);

export default function ChecklistEditor({ items = [], onChange }) {
  const [newTitle, setNewTitle] = useState('');

  const add = () => {
    const t = newTitle.trim();
    if (!t) return;
    onChange([...items, { id: uid(), title: t, description: '' }]);
    setNewTitle('');
  };

  const remove = (id) => onChange(items.filter(i => i.id !== id));

  const update = (id, field, value) =>
    onChange(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  const handleKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Checklist de ejecución</span>
        {items.length > 0 && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {items.length} paso{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-2 p-2.5 bg-muted/40 rounded-lg border border-border group">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
              <div className="flex items-center justify-center h-5 w-5 rounded-full border-2 border-muted-foreground/30 text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Input
                  value={item.title}
                  onChange={e => update(item.id, 'title', e.target.value)}
                  className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 font-medium"
                  placeholder="Paso del checklist..."
                />
                <Input
                  value={item.description || ''}
                  onChange={e => update(item.id, 'description', e.target.value)}
                  className="h-6 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 text-muted-foreground"
                  placeholder="Descripción opcional..."
                />
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Agregar paso (Enter para confirmar)..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={handleKey}
          className="h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="shrink-0 gap-1 h-8">
          <Plus className="h-3.5 w-3.5" /> Agregar
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground/60 text-center py-1">
          Sin pasos — la tarea generada no tendrá checklist
        </p>
      )}
    </div>
  );
}