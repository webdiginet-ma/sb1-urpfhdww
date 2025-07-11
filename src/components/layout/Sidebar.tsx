import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList,
  LogOut, 
  Shield,
  User,
  Eye,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: ('super_admin' | 'admin' | 'expert' | 'constateur')[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Missions', href: '/missions', icon: ClipboardList },
  { name: 'Gestion des Experts', href: '/expert-management', icon: Users, roles: ['super_admin', 'admin'] },
  { name: 'Mes Constatateurs', href: '/constateur-management', icon: Eye, roles: ['super_admin', 'admin', 'expert'] },
  { name: 'Profil', href: '/profile', icon: User },
];

export const Sidebar: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      console.log('🚪 [Sidebar] User clicked sign out');
      
      // Afficher une confirmation
      const confirmLogout = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
      if (!confirmLogout) {
        return;
      }

      // Afficher un indicateur de chargement
      const logoutButton = document.querySelector('[data-logout-button]') as HTMLButtonElement;
      if (logoutButton) {
        logoutButton.disabled = true;
        logoutButton.innerHTML = `
          <div class="flex items-center">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Déconnexion...
          </div>
        `;
      }

      await signOut();
    } catch (error) {
      console.error('❌ [Sidebar] Error during sign out:', error);
      // En cas d'erreur, forcer la redirection
      window.location.href = '/login';
    }
  };

  const filteredNavigation = navigation.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Administrateur';
      case 'expert':
        return 'Expert';
      case 'constateur':
        return 'Constatateur';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'text-red-400';
      case 'admin':
        return 'text-amber-400';
      case 'expert':
        return 'text-emerald-400';
      case 'constateur':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold">MissionControl</span>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.full_name?.charAt(0) || user?.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.full_name || user?.email}
            </p>
            <p className={`text-xs ${getRoleColor(user?.role || '')}`}>
              {getRoleDisplayName(user?.role || '')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon
                size={20}
                className={`mr-3 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          data-logout-button
          className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <LogOut size={20} className="mr-3 flex-shrink-0 text-gray-400 group-hover:text-white" />
          Déconnexion
        </button>
      </div>
    </div>
  );
};