import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Users, ClipboardList, 
  FileText, Bell, Settings, LogOut, ChevronLeft, ChevronRight, X, Store, Wrench
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/communities', icon: Building2, label: 'Comunidades', superadminOnly: true },
  { path: '/tasks', icon: ClipboardList, label: 'Tareas' },
  { path: '/procedures', icon: FileText, label: 'Procedimientos' },
  { path: '/users', icon: Users, label: 'Usuarios' },
  { path: '/suppliers', icon: Store, label: 'Proveedores' },
  { path: '/maintenances', icon: Wrench, label: 'Mantenciones' },
  { path: '/notifications', icon: Bell, label: 'Notificaciones' },
  { path: '/settings', icon: Settings, label: 'Mantenedores', superadminOnly: true },
];

export default function Sidebar({ user, collapsed, setCollapsed, mobileOpen, setMobileOpen, unreadCount }) {
  const location = useLocation();
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const filteredItems = NAV_ITEMS.filter(item => !item.superadminOnly || isSuperAdmin);

  const handleLogout = () => base44.auth.logout('/');

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border shrink-0",
        collapsed ? "p-3 justify-center h-16" : "px-4 h-16"
      )}>
        {collapsed ? (
          <img
            src="https://media.base44.com/images/public/69be92d9b179f726fbced205/06d8d1e40_image.png"
            alt="CC"
            className="h-8 w-8 object-contain"
          />
        ) : (
          <img
            src="https://media.base44.com/images/public/69be92d9b179f726fbced205/06d8d1e40_image.png"
            alt="Comunidad Conecta"
            className="h-9 w-auto object-contain brightness-0 invert"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredItems.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.path === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
              {collapsed && item.path === '/notifications' && unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {(user.full_name || user.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                {user.full_name || user.email}
              </p>
              <p className="text-xs text-sidebar-foreground/40 truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/50 hover:text-red-400 hover:bg-sidebar-accent transition-colors w-full",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
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
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0 relative",
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