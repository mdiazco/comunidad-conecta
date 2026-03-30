/**
 * RBAC Hook — Sistema de Control de Acceso Basado en Roles
 * Soporta impersonación de roles por el Super Admin
 */
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const IMPERSONATE_KEY = 'rbac_impersonate_role_id';

// Módulos del sistema y sus rutas asociadas
export const MODULES = {
  dashboard: { label: 'Dashboard', path: '/dashboard' },
  comunidad: { label: 'Comunidades', path: '/communities' },
  tareas: { label: 'Tareas', path: '/tasks' },
  mantenciones: { label: 'Mantenciones', path: '/maintenances' },
  procedimientos: { label: 'Procedimientos', path: '/procedures' },
  proveedores: { label: 'Proveedores/Scoring', path: '/providers' },
  contratos: { label: 'Contratos', path: '/contracts' },
  usuarios: { label: 'Usuarios', path: '/users' },
  salud: { label: 'Salud del Edificio', path: '/building-health' },
  notificaciones: { label: 'Notificaciones', path: '/notifications' },
};

export const ACTIONS = ['ver', 'crear', 'editar', 'eliminar'];

// Permisos del Super Admin (acceso total)
export const SUPERADMIN_PERMISSIONS = Object.fromEntries(
  Object.keys(MODULES).map(mod => [mod, { ver: true, crear: true, editar: true, eliminar: true }])
);

export function isSuperAdminUser(user) {
  return user?.role === 'superadmin' || user?.role === 'admin';
}

export function useRBAC(user) {
  const [roles, setRoles] = useState([]);
  const [impersonatedRoleId, setImpersonatedRoleId] = useState(() => sessionStorage.getItem(IMPERSONATE_KEY));
  const [impersonatedRole, setImpersonatedRole] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const isSuperAdmin = isSuperAdminUser(user);

  // Load all roles
  useEffect(() => {
    base44.entities.Role.list()
      .then(r => { setRoles(r); setLoadingRoles(false); })
      .catch(() => setLoadingRoles(false));
  }, []);

  // Find user's assigned role (via user.rbac_role_id)
  useEffect(() => {
    if (!user || !roles.length) return;
    if (user.rbac_role_id) {
      const found = roles.find(r => r.id === user.rbac_role_id);
      setUserRole(found || null);
    }
  }, [user, roles]);

  // Sync impersonated role
  useEffect(() => {
    if (impersonatedRoleId && roles.length > 0) {
      const found = roles.find(r => r.id === impersonatedRoleId);
      setImpersonatedRole(found || null);
    } else {
      setImpersonatedRole(null);
    }
  }, [impersonatedRoleId, roles]);

  const startImpersonation = useCallback((roleId) => {
    sessionStorage.setItem(IMPERSONATE_KEY, roleId);
    setImpersonatedRoleId(roleId);
  }, []);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(IMPERSONATE_KEY);
    setImpersonatedRoleId(null);
    setImpersonatedRole(null);
  }, []);

  // Active permissions: if superadmin and NOT impersonating → full access
  // If impersonating → use impersonated role permissions
  // If regular user → use their role permissions
  const activePermissions = (() => {
    if (isSuperAdmin && !impersonatedRoleId) return SUPERADMIN_PERMISSIONS;
    if (impersonatedRole) return impersonatedRole.permissions || {};
    if (userRole) return userRole.permissions || {};
    // Default: only dashboard visible
    return { dashboard: { ver: true } };
  })();

  const can = useCallback((module, action = 'ver') => {
    return !!activePermissions[module]?.[action];
  }, [activePermissions]);

  const canView = useCallback((module) => can(module, 'ver'), [can]);

  return {
    roles,
    loadingRoles,
    isSuperAdmin,
    isImpersonating: !!impersonatedRoleId,
    impersonatedRole,
    userRole,
    activePermissions,
    can,
    canView,
    startImpersonation,
    stopImpersonation,
    refreshRoles: () => base44.entities.Role.list().then(setRoles),
  };
}