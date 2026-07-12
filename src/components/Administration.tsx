import { useState, useEffect } from 'react';
import { UserCog, Shield, Lock, Building2, Palette, Wrench } from 'lucide-react';
import UserAdministration from './UserAdministration';
import RolesManagement from './RolesManagement';
import SecurityGroupsManagement from './SecurityGroupsManagement';
import CompaniesManagement from './CompaniesManagement';
import InterfaceManagement from './InterfaceManagement';
import SystemRepair from './SystemRepair';
import { authService } from '../lib/authorization';
import { supabase } from '../lib/supabase';
import { MODULE_KEYS } from '../lib/moduleKeys';

type AdminView = 'users' | 'roles' | 'security_groups' | 'companies' | 'interface' | 'repair';

export default function Administration() {
  const [allowedModules, setAllowedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllowedModules();
  }, []);

  const loadAllowedModules = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const context = await authService.getUserAuthContext(user.id);
    const modules = new Set<string>();

    Object.values(MODULE_KEYS).forEach(moduleKey => {
      if (authService.isModuleAccessEnabled(context.roles, moduleKey)) {
        modules.add(moduleKey);
      }
    });

    setAllowedModules(modules);
    setLoading(false);
  };

  const allNavItems = [
    { id: 'users', label: 'User Administration', icon: UserCog, moduleKey: MODULE_KEYS.users },
    { id: 'roles', label: 'Roles Management', icon: Shield, moduleKey: MODULE_KEYS.roles },
    { id: 'security_groups', label: 'Security Groups', icon: Lock, moduleKey: MODULE_KEYS.security_groups },
    { id: 'companies', label: 'Compañías', icon: Building2, moduleKey: 'companies' },
    { id: 'interface', label: 'Interfaz', icon: Palette, moduleKey: MODULE_KEYS.settings },
    { id: 'repair', label: 'Reparación del Sistema', icon: Wrench, moduleKey: 'system_repair' },
  ];

  const nav = allNavItems.filter(item =>
    item.moduleKey === 'companies' ||
    item.moduleKey === 'system_repair' ||
    allowedModules.has(item.moduleKey)
  );

  const [view, setView] = useState<AdminView>('users');

  useEffect(() => {
    if (nav.length > 0 && !nav.find(n => n.id === view)) {
      setView(nav[0].id as AdminView);
    }
  }, [nav]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (nav.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
          <p className="text-gray-500">You don't have access to any administration modules</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-sm text-gray-600 mt-1">Manage users, roles, and security</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {nav.map(item => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as AdminView)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-hidden">
          <div className="h-full">
            {view === 'users' && <UserAdministration />}
            {view === 'roles' && <RolesManagement />}
            {view === 'security_groups' && <SecurityGroupsManagement />}
            {view === 'companies' && <CompaniesManagement />}
            {view === 'interface' && <InterfaceManagement />}
            {view === 'repair' && <SystemRepair />}
          </div>
        </main>
      </div>
    </div>
  );
}
