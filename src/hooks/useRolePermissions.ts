import { useAuth } from '../context/AuthContext';

export const useRolePermissions = () => {
  const { user } = useAuth();

  const hasRole = (requiredRoles: string | string[]): boolean => {
    if (!user) return false;
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(user.role);
  };

  const canAccessAdmin = (): boolean => {
    return hasRole(['super_admin', 'admin']);
  };

  const canAccessExpert = (): boolean => {
    return hasRole(['super_admin', 'admin', 'expert']);
  };

  const canManageUsers = (): boolean => {
    return hasRole(['super_admin', 'admin']);
  };

  const canManageBuildings = (): boolean => {
    return hasRole(['super_admin', 'admin', 'expert']);
  };

  const canManageMissions = (): boolean => {
    return hasRole(['super_admin', 'admin', 'expert']);
  };

  const canViewAllMissions = (): boolean => {
    return hasRole(['super_admin', 'admin', 'expert']);
  };

  const canAssignMissions = (): boolean => {
    return hasRole(['super_admin', 'admin', 'expert']);
  };

  const isConstateur = (): boolean => {
    return user?.role === 'constateur';
  };

  const isExpert = (): boolean => {
    return user?.role === 'expert';
  };

  const isAdmin = (): boolean => {
    return hasRole(['super_admin', 'admin']);
  };

  const isSuperAdmin = (): boolean => {
    return user?.role === 'super_admin';
  };

  return {
    user,
    hasRole,
    canAccessAdmin,
    canAccessExpert,
    canManageUsers,
    canManageBuildings,
    canManageMissions,
    canViewAllMissions,
    canAssignMissions,
    isConstateur,
    isExpert,
    isAdmin,
    isSuperAdmin,
  };
};