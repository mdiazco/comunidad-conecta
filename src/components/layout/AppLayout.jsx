import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/lib/useRBAC';
import ImpersonationBanner from '@/components/rbac/ImpersonationBanner';
import AdminOnlyAccess from '@/components/AdminOnlyAccess';

export default function AppLayout() {
  const { user, loading } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const rbac = useRBAC(user);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.Notification.filter({ user_email: user.email, read: false })
      .then(n => setUnreadCount(n.length))
      .catch(() => {});
  }, [user?.email]);

  if (loading || rbac.loadingRoles) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Solo usuarios con rol de plataforma "admin" pueden acceder al panel.
  // TEMPORAL-BYPASS — eliminar tras pruebas Fase 5 (usuario de prueba no-admin)
  const TEMP_BYPASS_EMAIL = 'manuel@vertex365.cl';
  if (user?.role !== 'admin' && user?.email?.toLowerCase() !== TEMP_BYPASS_EMAIL) {
    return <AdminOnlyAccess userName={user?.full_name || user?.email} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {rbac.isImpersonating && (
        <ImpersonationBanner
          impersonatedRole={rbac.impersonatedRole}
          onStop={rbac.stopImpersonation}
        />
      )}
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar
          user={user}
          rbac={rbac}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          unreadCount={unreadCount}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setMobileOpen(true)} unreadCount={unreadCount} user={user} />
          <main className="flex-1 overflow-y-auto p-5 lg:p-7 bg-background">
            <Outlet context={{ user, unreadCount, setUnreadCount, rbac }} />
          </main>
        </div>
      </div>
    </div>
  );
}