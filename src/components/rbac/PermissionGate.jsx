import React from 'react';
import { ShieldOff } from 'lucide-react';

/**
 * Bloquea el render de children si no hay permiso.
 * Muestra mensaje si showBlocked=true (para páginas completas).
 */
export default function PermissionGate({ can, showBlocked = false, children }) {
  if (can) return children;
  if (!showBlocked) return null;
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">Acceso restringido</h3>
      <p className="text-sm text-muted-foreground">No tienes permiso para ver este módulo.</p>
    </div>
  );
}