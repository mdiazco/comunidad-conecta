// Role hierarchy and permission checks for Comunidad Conecta 2.0

export function isSuperAdmin(user) {
  return user?.role === 'superadmin' || user?.role === 'admin';
}

export function getUserCommunityRole(memberships, communityId) {
  if (!memberships || !communityId) return null;
  const m = memberships.find(m => m.community_id === communityId && m.status === 'active');
  return m?.role || null;
}

export function canCreateTask(globalRole, communityRole) {
  return isSuperAdminRole(globalRole) || communityRole === 'administrador' || communityRole === 'equipo';
}

export function canAssignTask(globalRole, communityRole) {
  return isSuperAdminRole(globalRole) || communityRole === 'administrador';
}

export function canObserveTask(communityRole) {
  return communityRole === 'comite';
}

export function canStartFinishTask(globalRole, communityRole, taskAssignedTo, userEmail) {
  if (isSuperAdminRole(globalRole)) return true;
  if (communityRole === 'administrador' || communityRole === 'equipo') return true;
  if (communityRole === 'operativo' && taskAssignedTo === userEmail) return true;
  return false;
}

export function canUploadEvidence(globalRole, communityRole) {
  return isSuperAdminRole(globalRole) || ['administrador', 'equipo', 'operativo'].includes(communityRole);
}

export function canManageCommunity(globalRole) {
  return isSuperAdminRole(globalRole);
}

export function canManageUsers(globalRole, communityRole) {
  return isSuperAdminRole(globalRole) || communityRole === 'administrador';
}

function isSuperAdminRole(globalRole) {
  return globalRole === 'superadmin' || globalRole === 'admin';
}