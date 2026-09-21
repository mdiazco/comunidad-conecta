import React from 'react';
import { ShieldX, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function AdminOnlyAccess({ userName }) {
  const { logout } = useAuth();

  return (
    <div className="h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acceso restringido</h1>
        <p className="text-muted-foreground mb-1">
          Este panel es exclusivo para administradores.
        </p>
        {userName && (
          <p className="text-sm text-muted-foreground/80 mb-6">
            Hola {userName}, tu cuenta no tiene el rol requerido para ingresar.
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-6">
          Si crees que esto es un error, solicita que te inviten con rol <span className="font-semibold text-foreground">admin</span>.
        </p>
        <Button onClick={() => logout(true)} variant="default">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}