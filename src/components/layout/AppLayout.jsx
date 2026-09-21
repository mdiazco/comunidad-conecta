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

  // Fase 5 — gate: acceso para admin de plataforma o miembros activos de cualquier comunidad
  const [membershipChecked, setMembershipChecked] = useState(false);
  const [hasCommunity, setHasCommunity] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      setHasCommunity(true); setMembershipChecked(true); return;
    }
    base44.entities.CommunityMember.filter({ user_email: user.email, status: 'active' })
      .then(m => { setHasCommunity(m.length > 0); setMembershipChecked(true); })
      .catch(() => { setHasCommunity(false); setMembershipChecked(true); });
  }, [user?.email, user?.role]);

  useEffect(() => {
    if (!user?.email) return;
    base44.entities.Notification.filter({ user_email: user.email, read: false })
      .then(n => setUnreadCount(n.length))
      .catch(() => {});
  }, [user?.email]);

  if (loading || rbac.loadingRoles || !membershipChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Fase 5 — acceso para admin de plataforma o miembros activos de cualquier comunidad
  const isPlatformAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  if (!isPlatformAdmin && !hasCommunity) {
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