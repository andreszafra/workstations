import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, TrendingUp, Users, Grid, PieChart, Building2, Share2, Copy, Check } from 'lucide-react';

interface CompanyAnalyticsData {
  totalWorkstations: number;
  availableWorkstations: number;
  availableOperational: number;
  availableAdministrative: number;
  assignedWorkstations: number;
  maintenanceWorkstations: number;
  pendingWorkstations: number;
  unavailableWorkstations: number;
  outOfServiceWorkstations: number;
  administrativeWorkstations: number;
  operationalWorkstations: number;
  totalSites: number;
  workstationsByType: { type: string; count: number }[];
  workstationsBySite: { site: string; count: number }[];
  totalEmployees: number;
  maleEmployees: number;
  femaleEmployees: number;
  unspecifiedGenderEmployees: number;
  employeesByArea: { area: string; count: number }[];
  employeesBySite: { site: string; count: number }[];
  utilizationRate: number;
  utilizationRateOperational: number;
  utilizationRateAdministrative: number;
}

export default function CompanyAnalytics({ onClose }: { onClose: () => void }) {
  const [analytics, setAnalytics] = useState<CompanyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data: sites } = await supabase.from('sites').select('id, name');
      const { data: workstations } = await supabase
        .from('workstations')
        .select('*, workstation_types(name, is_administrative, is_operational), sites(name)');
      const { data: employees } = await supabase.from('employees').select('*, sites(name)');

      const ws = workstations || [];
      const emps = employees || [];

      const administrativeCount = ws.filter(w => (w.workstation_types as any)?.is_administrative === true).length;
      const operationalCount = ws.filter(w => (w.workstation_types as any)?.is_operational === true).length;

      const statusCounts = {
        available: ws.filter(w => w.status === 'available').length,
        assigned: ws.filter(w => w.status === 'assigned').length,
        maintenance: ws.filter(w => w.status === 'maintenance').length,
        pending: ws.filter(w => w.status === 'pending').length,
        unavailable: ws.filter(w => w.status === 'unavailable').length,
        out_of_service: ws.filter(w => w.status === 'out_of_service').length,
      };

      const availableOperational = ws.filter(w =>
        w.status === 'available' && (w.workstation_types as any)?.is_operational === true
      ).length;

      const availableAdministrative = ws.filter(w =>
        w.status === 'available' && (w.workstation_types as any)?.is_administrative === true
      ).length;

      const typeMap = new Map<string, number>();
      ws.forEach(w => {
        const typeName = (w.workstation_types as any)?.name || 'Sin tipo';
        typeMap.set(typeName, (typeMap.get(typeName) || 0) + 1);
      });

      const siteWorkstationMap = new Map<string, number>();
      ws.forEach(w => {
        const siteName = (w.sites as any)?.name || 'Sin sede';
        siteWorkstationMap.set(siteName, (siteWorkstationMap.get(siteName) || 0) + 1);
      });

      const areaMap = new Map<string, number>();
      emps.forEach(e => {
        const area = e.area || 'Sin área';
        areaMap.set(area, (areaMap.get(area) || 0) + 1);
      });

      const siteEmployeeMap = new Map<string, number>();
      emps.forEach(e => {
        const siteName = (e.sites as any)?.name || 'Sin sede';
        siteEmployeeMap.set(siteName, (siteEmployeeMap.get(siteName) || 0) + 1);
      });

      const genderCounts = {
        male: emps.filter(e => e.gender === 'masculino').length,
        female: emps.filter(e => e.gender === 'femenino').length,
        unspecified: emps.filter(e => !e.gender).length,
      };

      const utilizationRate = ws.length > 0 ? (statusCounts.assigned / ws.length) * 100 : 0;
      const utilizationRateOperational = operationalCount > 0
        ? (ws.filter(w => w.status === 'assigned' && (w.workstation_types as any)?.is_operational === true).length / operationalCount) * 100
        : 0;
      const utilizationRateAdministrative = administrativeCount > 0
        ? (ws.filter(w => w.status === 'assigned' && (w.workstation_types as any)?.is_administrative === true).length / administrativeCount) * 100
        : 0;

      setAnalytics({
        totalWorkstations: ws.length,
        availableWorkstations: statusCounts.available,
        availableOperational,
        availableAdministrative,
        assignedWorkstations: statusCounts.assigned,
        maintenanceWorkstations: statusCounts.maintenance,
        pendingWorkstations: statusCounts.pending,
        unavailableWorkstations: statusCounts.unavailable,
        outOfServiceWorkstations: statusCounts.out_of_service,
        administrativeWorkstations: administrativeCount,
        operationalWorkstations: operationalCount,
        totalSites: (sites || []).length,
        workstationsByType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        workstationsBySite: Array.from(siteWorkstationMap.entries()).map(([site, count]) => ({ site, count })).sort((a, b) => b.count - a.count),
        totalEmployees: emps.length,
        maleEmployees: genderCounts.male,
        femaleEmployees: genderCounts.female,
        unspecifiedGenderEmployees: genderCounts.unspecified,
        employeesByArea: Array.from(areaMap.entries()).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
        employeesBySite: Array.from(siteEmployeeMap.entries()).map(([site, count]) => ({ site, count })).sort((a, b) => b.count - a.count),
        utilizationRate,
        utilizationRateOperational,
        utilizationRateAdministrative,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?readonly=true&company=true`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowShareMenu(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b px-6 py-4 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Analíticas de la Empresa</h2>
              <p className="text-sm text-blue-100">Resumen de todas las sedes y recursos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Compartir"
              >
                <Share2 className="w-5 h-5" />
              </button>

              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 text-gray-900 z-10">
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Compartir Analíticas
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Comparte una vista de solo lectura de las analíticas de la empresa
                    </p>
                    <button
                      onClick={handleShare}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          ¡Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copiar Enlace
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando analíticas...</div>
          ) : analytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Sedes Totales"
                  value={analytics.totalSites}
                  icon={<Building2 className="w-5 h-5" />}
                  bgColor="bg-blue-500"
                />
                <StatCard
                  title="Empleados Totales"
                  value={analytics.totalEmployees}
                  icon={<Users className="w-5 h-5" />}
                  bgColor="bg-orange-500"
                />
                <StatCard
                  title="Estaciones Totales"
                  value={analytics.totalWorkstations}
                  icon={<Grid className="w-5 h-5" />}
                  bgColor="bg-slate-500"
                  subtitle={`${analytics.operationalWorkstations} Operativas | ${analytics.administrativeWorkstations} Administrativas`}
                />
                <StatCard
                  title="Tasa de Utilización"
                  value={`${analytics.utilizationRate.toFixed(1)}%`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  bgColor="bg-blue-600"
                  subtitle={`Op: ${analytics.utilizationRateOperational.toFixed(1)}% | Adm: ${analytics.utilizationRateAdministrative.toFixed(1)}%`}
                />
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-900 flex items-center gap-2">
                  <Grid className="w-5 h-5" />
                  Estaciones Disponibles
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-700">{analytics.availableWorkstations}</div>
                    <div className="text-sm text-green-800 mt-1">Total Disponibles</div>
                  </div>
                  <div className="text-center border-l border-green-300">
                    <div className="text-4xl font-bold text-blue-600">{analytics.availableOperational}</div>
                    <div className="text-sm text-gray-700 mt-1">Operativas</div>
                  </div>
                  <div className="text-center border-l border-green-300">
                    <div className="text-4xl font-bold text-purple-600">{analytics.availableAdministrative}</div>
                    <div className="text-sm text-gray-700 mt-1">Administrativas</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Grid className="w-5 h-5 text-blue-600" />
                    Estado de Estaciones
                  </h3>
                  <div className="space-y-3">
                    <StatusBar label="Disponibles" count={analytics.availableWorkstations} total={analytics.totalWorkstations} color="bg-green-500" />
                    <StatusBar label="Asignadas" count={analytics.assignedWorkstations} total={analytics.totalWorkstations} color="bg-blue-500" />
                    <StatusBar label="Administrativas" count={analytics.administrativeWorkstations} total={analytics.totalWorkstations} color="bg-purple-500" />
                    <StatusBar label="Mantenimiento" count={analytics.maintenanceWorkstations} total={analytics.totalWorkstations} color="bg-red-500" />
                    <StatusBar label="Pendientes" count={analytics.pendingWorkstations} total={analytics.totalWorkstations} color="bg-yellow-500" />
                    <StatusBar label="No Disponibles" count={analytics.unavailableWorkstations} total={analytics.totalWorkstations} color="bg-gray-500" />
                    <StatusBar label="Fuera de Servicio" count={analytics.outOfServiceWorkstations} total={analytics.totalWorkstations} color="bg-orange-500" />
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Empleados
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <span className="text-gray-600">Total de Empleados</span>
                      <span className="text-3xl font-bold text-blue-600">{analytics.totalEmployees}</span>
                    </div>
                    {analytics.totalEmployees > 0 && (
                      <>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Distribución por Género</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Masculino</span>
                              <span className="font-medium">{analytics.maleEmployees} ({((analytics.maleEmployees / analytics.totalEmployees) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Femenino</span>
                              <span className="font-medium">{analytics.femaleEmployees} ({((analytics.femaleEmployees / analytics.totalEmployees) * 100).toFixed(1)}%)</span>
                            </div>
                            {analytics.unspecifiedGenderEmployees > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">No especificado</span>
                                <span className="font-medium">{analytics.unspecifiedGenderEmployees}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {analytics.employeesByArea.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Por Área</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {analytics.employeesByArea.slice(0, 5).map(({ area, count }) => (
                                <div key={area} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{area}</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Estaciones por Tipo</h3>
                  {analytics.workstationsByType.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {analytics.workstationsByType.map(({ type, count }) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{type}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Sin tipos asignados</p>
                  )}
                </div>
              </div>

              {analytics.employeesBySite.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Empleados por Sede</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {analytics.employeesBySite.map(({ site, count }) => (
                      <div key={site} className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">{count}</div>
                        <div className="text-xs text-gray-600 mt-1">{site}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          ({((count / analytics.totalEmployees) * 100).toFixed(1)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics.workstationsBySite.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Estaciones por Sede</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {analytics.workstationsBySite.map(({ site, count }) => (
                      <div key={site} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{count}</div>
                        <div className="text-xs text-gray-600 mt-1">{site}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 text-blue-900">Resumen Ejecutivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Capacidad Total:</span>
                      <span className="text-blue-800 ml-1">
                        {analytics.totalWorkstations} estaciones ({analytics.operationalWorkstations} operativas, {analytics.administrativeWorkstations} administrativas)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Fuerza Laboral:</span>
                      <span className="text-blue-800 ml-1">
                        {analytics.totalEmployees} empleados en {analytics.totalSites} sede{analytics.totalSites !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Disponibilidad:</span>
                      <span className="text-blue-800 ml-1">
                        {analytics.availableWorkstations} estaciones ({analytics.availableOperational} op., {analytics.availableAdministrative} adm.)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Utilización:</span>
                      <span className="text-blue-800 ml-1">
                        {analytics.utilizationRate.toFixed(1)}% general (Op: {analytics.utilizationRateOperational.toFixed(1)}%, Adm: {analytics.utilizationRateAdministrative.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No hay datos disponibles</div>
          )}
        </div>

        <div className="border-t px-6 py-4 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor, subtitle }: { title: string; value: number | string; icon: React.ReactNode; bgColor: string; subtitle?: string }) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`${bgColor} text-white p-3 rounded-lg`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function GenderBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
