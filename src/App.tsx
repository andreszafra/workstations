import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Monitor, MapPin, Users, Settings as SettingsIcon, LogOut, User, ChevronDown, ShieldAlert } from 'lucide-react';
import * as Icons from 'lucide-react';
import Dashboard from './components/Dashboard';
import Workstations from './components/Workstations';
import Sites from './components/Sites';
import Employees from './components/Employees';
import Settings from './components/Settings';
import Administration from './components/Administration';
import Profile from './components/Profile';
import Login from './components/Login';
import ForcePasswordChange from './components/ForcePasswordChange';
import { supabase } from './lib/supabase';
import { authService } from './lib/authorization';
import { MODULE_KEYS } from './lib/moduleKeys';

type View = 'dashboard' | 'workstations' | 'sites' | 'employees' | 'settings' | 'administration' | 'profile';

interface SystemConfig {
  site_title: string;
  site_subtitle: string;
  logo_icon: string;
  primary_color: string;
  secondary_color: string;
  generic_logo_url: string | null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [allowedModules, setAllowedModules] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    site_title: 'Gestor de Estaciones de Trabajo',
    site_subtitle: 'Gestión Visual de Activos',
    logo_icon: 'Monitor',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    generic_logo_url: null,
  });
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [userColors, setUserColors] = useState<{ primary: string; secondary: string } | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  useEffect(() => {
    if (isAuthenticated && user) {
      checkPasswordChangeRequirement();
      loadSystemConfig();
      loadUserRoles();
      loadUserCompanyLogo();
      loadUserPreferences();
      loadAllowedModules();
    }
  }, [isAuthenticated, user]);

  const checkPasswordChangeRequirement = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_password_requirements')
      .select('require_password_change')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.require_password_change) {
      setRequirePasswordChange(true);
    } else {
      setRequirePasswordChange(false);
    }
  };

  const loadAllowedModules = async () => {
    if (!user) return;

    const context = await authService.getUserAuthContext(user.id);
    const modules = new Set<string>();

    Object.values(MODULE_KEYS).forEach(moduleKey => {
      if (authService.isModuleAccessEnabled(context.roles, moduleKey)) {
        modules.add(moduleKey);
      }
    });

    setAllowedModules(modules);
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      setUser(session.user);
      setIsAuthenticated(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  };

  const loadSystemConfig = async () => {
    const { data } = await supabase
      .from('system_config')
      .select('site_title, site_subtitle, logo_icon, primary_color, default_secondary_color, generic_logo_url')
      .limit(1)
      .maybeSingle();

    if (data) {
      setConfig({
        site_title: data.site_title || 'Gestor de Estaciones de Trabajo',
        site_subtitle: data.site_subtitle || 'Gestión Visual de Activos',
        logo_icon: data.logo_icon || 'Monitor',
        primary_color: data.primary_color || '#2563eb',
        secondary_color: data.default_secondary_color || '#1e40af',
        generic_logo_url: data.generic_logo_url || null,
      });
    }
  };

  const loadUserCompanyLogo = async () => {
    if (!user) return;

    const { data: employee } = await supabase
      .from('employees')
      .select('company_id, companies(logo_url)')
      .eq('email', user.email)
      .maybeSingle();

    if (employee?.companies?.logo_url) {
      setCompanyLogo(employee.companies.logo_url);
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('primary_color, secondary_color')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setUserColors({
        primary: data.primary_color || config.primary_color,
        secondary: data.secondary_color || config.secondary_color,
      });
    }
  };

  const loadUserRoles = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id);

    if (data) {
      const roles = data.map((ur: any) => ur.role?.name).filter(Boolean);
      setUserRoles(roles);
    }
  };

  const handleLogin = async (authUser: any) => {
    setUser(authUser);
    setIsAuthenticated(true);
  };

  const handlePasswordChanged = () => {
    setRequirePasswordChange(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setView('dashboard');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (requirePasswordChange) {
    return <ForcePasswordChange onPasswordChanged={handlePasswordChanged} />;
  }

  const isAdmin = userRoles.includes('Admin') || userRoles.includes('SuperAdmin');
  const LogoIcon = (Icons as any)[config.logo_icon] || Monitor;

  const activePrimaryColor = userColors?.primary || config.primary_color;
  const activeSecondaryColor = userColors?.secondary || config.secondary_color;

  const allNavItems = [
    { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard, moduleKey: MODULE_KEYS.dashboard },
    { id: 'workstations', label: 'Estaciones de Trabajo', icon: Monitor, moduleKey: MODULE_KEYS.workstations },
    { id: 'sites', label: 'Mapas de Sedes', icon: MapPin, moduleKey: MODULE_KEYS.sites },
    { id: 'employees', label: 'Empleados', icon: Users, moduleKey: MODULE_KEYS.employees },
  ];

  const nav = allNavItems.filter(item => allowedModules.has(item.moduleKey));

  const getUserDisplayName = () => {
    if (user?.user_metadata?.first_name || user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim();
    }
    return user?.email || 'User';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {(companyLogo || config.generic_logo_url) && (
                <button
                  onClick={() => setView('dashboard')}
                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                  title="Ir al Dashboard"
                >
                  <img
                    src={companyLogo || config.generic_logo_url || ''}
                    alt="Company Logo"
                    className="h-12 w-12 object-contain rounded-lg border border-gray-200"
                  />
                </button>
              )}
              {!companyLogo && !config.generic_logo_url && (
                <button
                  onClick={() => setView('dashboard')}
                  className="p-2 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: activePrimaryColor }}
                  title="Ir al Dashboard"
                >
                  <LogoIcon className="w-6 h-6 text-white" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{config.site_title}</h1>
                <p className="text-xs text-gray-500">{config.site_subtitle}</p>
              </div>
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      setView('profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Profile</span>
                  </button>
                  {allowedModules.has(MODULE_KEYS.settings) && (
                    <button
                      onClick={() => {
                        setView('settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      <span className="text-sm">Personalización</span>
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setView('administration');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span className="text-sm">Administration</span>
                    </button>
                  )}
                  <div className="border-t border-gray-200 my-2"></div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {view === 'administration' || view === 'profile' ? (
        <div className="h-[calc(100vh-4rem)]">
          {view === 'administration' && <Administration />}
          {view === 'profile' && <Profile />}
        </div>
      ) : (
        <div className="flex">
          <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
            <nav className="p-4 space-y-1">
              {nav.map(item => {
                const Icon = item.icon;
                const isActive = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id as View)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'text-white font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={isActive ? { backgroundColor: activePrimaryColor } : {}}
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
              {view === 'dashboard' && <div className="p-8 max-w-7xl mx-auto"><Dashboard /></div>}
              {view === 'workstations' && <div className="p-8 max-w-7xl mx-auto"><Workstations /></div>}
              {view === 'sites' && <div className="p-8 max-w-7xl mx-auto"><Sites /></div>}
              {view === 'employees' && <div className="p-6 xl:p-8"><Employees /></div>}
              {view === 'settings' && <div className="p-8 max-w-7xl mx-auto"><Settings /></div>}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
