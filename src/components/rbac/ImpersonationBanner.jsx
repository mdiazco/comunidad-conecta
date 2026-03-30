import React from 'react';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImpersonationBanner({ impersonatedRole, onStop }) {
  if (!impersonatedRole) return null;
  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium z-50 shrink-0">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>Vista simulada como: <strong>{impersonatedRole.name}</strong></span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:bg-amber-600 h-7 px-2"
        onClick={onStop}
      >
        <X className="h-3.5 w-3.5 mr-1" /> Salir de simulación
      </Button>
    </div>
  );
}