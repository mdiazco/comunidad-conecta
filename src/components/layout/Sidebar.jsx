import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Users, ClipboardList, 
  Bell, LogOut, ChevronLeft, ChevronRight, X, Store, Wrench, Star, HeartPulse, Shield, BarChart2, UserCog, DollarSign, Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

// module key must match MODULES in useRBAC.js
const NAV_ITEMS = [
  { path: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard',         module: 'dashboard' },
  { path: '/communities',     icon: Building2,        label: 'Comunidades',       module: 'comunidad' },
  { path: '/tasks',           icon: ClipboardList,    label: 'Tareas',            module: 'tareas' },
  { path: '/budget-approval',  icon: DollarSign,       label: 'Aprobación Presup.', module: 'tareas' },
  { path: '/budget-dashboard', icon: BarChart2,       label: 'Dashboard Presup.',  module: 'tareas' },
  { path: '/maintenances',    icon: Wrench,           label: 'Mantenciones',      module: 'mantenciones' },
  { path: '/providers',       icon: Star,             label: 'Scoring Proveedores', module: 'proveedores' },
  { path: '/suppliers',       icon: Store,            label: 'Proveedores',       module: 'proveedores' },
  { path: '/building-health', icon: HeartPulse,       label: 'Salud del Edificio', module: 'salud' },
  { path: '/committee-members', icon: UserCog,          label: 'Comité',            module: 'usuarios' },
  { path: '/users',           icon: Users,            label: 'Usuarios',          module: 'usuarios', superadminOnly: true },
  { path: '/leads',           icon: Inbox,            label: 'Solicitudes',       module: 'usuarios', superadminOnly: true },
  { path: '/notifications',   icon: Bell,             label: 'Notificaciones',    module: 'notificaciones' },
  { path: '/roles',           icon: Shield,           label: 'Roles y Permisos',  module: null, superadminOnly: true, alwaysVisible: true },
];

const LOGO_URL = "https://media.base44.com/images/public/69be92d9b179f726fbced205/6eda2364a_comunidad-removebg-preview1.png";

export default function Sidebar({ user, rbac, collapsed, setCollapsed, mobileOpen, setMobileOpen, unreadCount }) {
  const location = useLocation();
  const isSuperAdmin = rbac?.isSuperAdmin ?? (user?.role === 'superadmin' || user?.role === 'admin');
  const isImpersonating = rbac?.isImpersonating ?? false;

  const filteredItems = NAV_ITEMS.filter(item => {
    // superadminOnly + alwaysVisible: show to superadmin always (even when impersonating)
    if (item.superadminOnly && item.alwaysVisible) return isSuperAdmin;
    // superadminOnly: show only to superadmin and only when NOT impersonating
    if (item.superadminOnly) return isSuperAdmin && !isImpersonating;
    // RBAC check: if module is defined, check canView
    if (item.module && rbac) return rbac.canView(item.module);
    return true;
  });

  const handleLogout = () => base44.auth.logout('/');

  const navContent = (
    <div className="flex flex-col h-full relative">
      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute -inset-8 z-0"
        style={{
          background:
            "radial-gradient(circle at 82% 8%, rgba(255,255,255,.28), transparent 30%), radial-gradient(circle at 5% 78%, rgba(91,231,255,.2), transparent 32%)"
        }}
      />

      {/* Logo */}
      <div className={cn(
        "relative z-[1] flex items-center shrink-0 border-b border-white/20",
        collapsed ? "p-3 justify-center h-[54px]" : "h-[54px] px-2.5"
      )}>
        <img
          src={LOGO_URL}
          alt="Comunidad Conecta"
          className={cn(
            "object-contain object-left-center block",
            collapsed ? "h-8 w-8" : "h-11 w-[150px]"
          )}
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>

      {/* Nav */}
      <nav className={cn(
        "relative z-[1] flex-1 overflow-y-auto mt-4",
        collapsed ? "flex flex-col gap-[3px] px-1" : "grid gap-[3px] px-0"
      )}>
        {filteredItems.map((item, i) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "cc-nav-item group relative flex items-center rounded-[10px] no-underline",
                "text-white/75 hover:text-white hover:bg-white/[0.14] hover:translate-x-0.5",
                "active:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2",
                "transition-[background,color,box-shadow,transform] duration-[180ms] ease-out",
                collapsed ? "justify-center min-h-[29px] p-1.5" : "min-h-[29px] gap-[11px] px-[11px] py-1.5",
                isActive && "cc-nav-active text-white bg-white/[0.23] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_6px_16px_rgba(24,18,108,0.15)] backdrop-blur-md",
                !collapsed && "animate-[cc-rise_450ms_cubic-bezier(.22,1,.36,1)_both]"
              )}
              style={!collapsed ? { animationDelay: `${0.04 + i * 0.03}s` } : undefined}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.9} />
              {!collapsed && <span className="truncate text-[11px] font-medium tracking-[0.015em] leading-tight">{item.label}</span>}
              {!collapsed && item.path === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-white/25 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-white/30">
                  {unreadCount}
                </span>
              )}
              {collapsed && item.path === '/notifications' && unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="relative z-[1] border-t border-white/20 pt-3 px-1 pb-1 shrink-0">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-1.5 pb-2.5 cc-rise-account" style={{ animation: 'cc-rise 500ms 0.4s cubic-bezier(.22,1,.36,1) both' }}>
            <div className="h-[29px] w-[29px] rounded-full bg-white/20 border border-white/35 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white">
                {(user.full_name || user.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[11px] font-semibold text-white truncate">
                {user.full_name || user.email}
              </p>
              <p className="text-[9px] text-white/55 truncate mt-[3px]">
                {isImpersonating ? rbac?.impersonatedRole?.name : (user.role || 'usuario')}
              </p>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="flex justify-center pb-2">
            <div className="h-7 w-7 rounded-full bg-white/20 border border-white/35 flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">
                {(user.full_name || user.email || '?')[0].toUpperCase()}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-[9px] text-white/60 hover:text-white hover:bg-white/[0.13] hover:translate-x-0.5",
            "active:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/90 focus-visible:outline-offset-2",
            "transition-[background,color,transform] duration-[180ms] ease-out text-[11px] font-medium tracking-[0.01em]",
            collapsed ? "justify-center p-2" : "px-2.5 py-2"
          )}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" strokeWidth={1.9} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 text-white transform transition-transform duration-300 ease-in-out lg:hidden",
        "bg-gradient-to-br from-[#155eef] via-[#4326b8] to-[#711fbd]",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 text-white/60 hover:text-white z-10"
        >
          <X className="h-4 w-4" />
        </button>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col text-white transition-all duration-300 ease-in-out shrink-0 relative",
        "bg-gradient-to-br from-[#155eef] via-[#4326b8] to-[#711fbd]",
        collapsed ? "w-[60px]" : "w-60"
      )}>
        {navContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center shadow-md hover:bg-accent transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  );
}