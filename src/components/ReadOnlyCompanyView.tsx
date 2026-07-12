import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Users, Monitor, BarChart3, MapPin, ChevronDown, PieChart, X } from 'lucide-react';
import type { Site } from '../lib/database.types';
import ReadOnlySiteView from './ReadOnlySiteView';

interface CompanyStats {
  totalSites: number;
  totalWorkstations: number;
  availableWorkstations: number;
  availableOperational: number;
  availableAdministrative: number;
  assignedWorkstations: number;
  maintenanceWorkstations: number;
  administrativeWorkstations: number;
  operationalWorkstations: number;
  totalEmployees: number;
  maleEmployees: number;
  femaleEmployees: number;
  utilizationRate: number;
  utilizationRateOperational: number;
  utilizationRateAdministrative: number;
  employeesByArea: { area: string; count: number }[];
}

interface SiteAvailability {
  siteId: string;
  siteName: string;
  count: number;
  percentage: number;
  color: string;
}

type ChartType = 'total' | 'operational' | 'administrative';

export default function ReadOnlyCompanyView() {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [showChart, setShowChart] = useState<ChartType | null>(null);
  const [chartData, setChartData] = useState<SiteAvailability[]>([]);
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: sitesData } = await supabase.from('sites').select('*').order('name');
      const { data: workstations } = await supabase.from('workstations').select('*, workstation_types(is_administrative, is_operational), sites(name)');
      const { data: employees } = await supabase.from('employees').select('*');

      const ws = workstations || [];
      const emps = employees || [];

      const administrativeCount = ws.filter(w => (w.workstation_types as any)?.is_administrative === true).length;
      const operationalCount = ws.filter(w => (w.workstation_types as any)?.is_operational === true).length;

      const availableOperational = ws.filter(w => w.status === 'available' && (w.workstation_types as any)?.is_operational === true).length;
      const availableAdministrative = ws.filter(w => w.status === 'available' && (w.workstation_types as any)?.is_administrative === true).length;

      const assignedCount = ws.filter(w => w.status === 'assigned').length;
      const utilizationRate = ws.length > 0 ? (assignedCount / ws.length) * 100 : 0;
      const utilizationRateOperational = operationalCount > 0
        ? (ws.filter(w => w.status === 'assigned' && (w.workstation_types as any)?.is_operational === true).length / operationalCount) * 100
        : 0;
      const utilizationRateAdministrative = administrativeCount > 0
        ? (ws.filter(w => w.status === 'assigned' && (w.workstation_types as any)?.is_administrative === true).length / administrativeCount) * 100
        : 0;

      const areaMap = new Map<string, number>();
      emps.forEach(e => {
        const area = e.area || 'Sin área';
        areaMap.set(area, (areaMap.get(area) || 0) + 1);
      });

      setStats({
        totalSites: (sitesData || []).length,
        totalWorkstations: ws.length,
        availableWorkstations: ws.filter(w => w.status === 'available').length,
        availableOperational,
        availableAdministrative,
        assignedWorkstations: assignedCount,
        maintenanceWorkstations: ws.filter(w => w.status === 'maintenance').length,
        administrativeWorkstations: administrativeCount,
        operationalWorkstations: operationalCount,
        totalEmployees: emps.length,
        maleEmployees: emps.filter(e => e.gender === 'masculino').length,
        femaleEmployees: emps.filter(e => e.gender === 'femenino').length,
        utilizationRate,
        utilizationRateOperational,
        utilizationRateAdministrative,
        employeesByArea: Array.from(areaMap.entries()).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
      });

      setSites(sitesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChartClick = async (type: ChartType) => {
    try {
      const { data: workstations } = await supabase
        .from('workstations')
        .select('*, workstation_types(is_administrative, is_operational), sites(name)')
        .eq('status', 'available');

      const ws = workstations || [];

      let filtered = ws;
      if (type === 'operational') {
        filtered = ws.filter(w => (w.workstation_types as any)?.is_operational === true);
      } else if (type === 'administrative') {
        filtered = ws.filter(w => (w.workstation_types as any)?.is_administrative === true);
      }

      const siteMap = new Map<string, { name: string; count: number }>();
      filtered.forEach(w => {
        const siteId = w.site_id;
        const siteName = (w.sites as any)?.name || 'Sin sede';
        if (siteMap.has(siteId)) {
          siteMap.get(siteId)!.count++;
        } else {
          siteMap.set(siteId, { name: siteName, count: 1 });
        }
      });

      const total = filtered.length;
      const colors = generateColors(siteMap.size);

      const data: SiteAvailability[] = Array.from(siteMap.entries())
        .map(([siteId, { name, count }], index) => ({
          siteId,
          siteName: name,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          color: colors[index],
        }))
        .sort((a, b) => b.count - a.count);

      setChartData(data);
      setShowChart(type);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const generateColors = (count: number): string[] => {
    const baseColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
      '#6366f1', '#a855f7', '#22c55e', '#eab308', '#f43f5e'
    ];

    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      const hue = (i * 137.5) % 360;
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (selectedSite) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b p-4 shadow-sm">
          <button
            onClick={() => setSelectedSite(null)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Vista General
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <ReadOnlySiteView siteId={selectedSite.id} />
        </div>
      </div>
    );
  }

  return (
    <>
      {showChart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Distribución por Sede - {
                  showChart === 'total' ? 'Total Disponibles' :
                  showChart === 'operational' ? 'Operativas Disponibles' :
                  'Administrativas Disponibles'
                }
              </h3>
              <button
                onClick={() => setShowChart(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {chartData.length > 0 ? (
                <>
                  <div className="flex justify-center mb-6">
                    <PieChartSVG data={chartData} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900 mb-3">Desglose por Sede</h4>
                    {chartData.map((item) => (
                      <div
                        key={item.siteId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-gray-900">{item.siteName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">{item.count} estaciones</span>
                          <span className="font-semibold text-gray-900 min-w-[60px] text-right">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No hay datos disponibles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Estadísticas Globales</h1>
              <p className="text-gray-600 mt-1">Vista general de todas las sedes y recursos</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <p className="text-amber-800 text-sm font-medium">Vista de Solo Lectura</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sedes Totales</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalSites}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Empleados</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.totalEmployees}</p>
                  </div>
                </div>
                {stats.totalEmployees > 0 && (
                  <div className="text-xs text-gray-600 mt-2">
                    <div>{stats.maleEmployees} H / {stats.femaleEmployees} M</div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <Monitor className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estaciones Totales</p>
                    <p className="text-2xl font-bold text-slate-600">{stats.totalWorkstations}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  <div>{stats.operationalWorkstations} Op. / {stats.administrativeWorkstations} Adm.</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Utilización</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.utilizationRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  <div>Op: {stats.utilizationRateOperational.toFixed(1)}% / Adm: {stats.utilizationRateAdministrative.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-900 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Estaciones Disponibles
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <button
                  onClick={() => handleChartClick('total')}
                  className="text-center hover:bg-green-200/50 rounded-lg p-3 transition-colors group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-5xl font-bold text-green-700">{stats.availableWorkstations}</div>
                    <PieChart className="w-5 h-5 text-green-700 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-sm text-green-800 mt-2 font-medium">Total Disponibles</div>
                </button>
                <button
                  onClick={() => handleChartClick('operational')}
                  className="text-center border-l border-green-300 hover:bg-blue-50 rounded-lg p-3 transition-colors group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-5xl font-bold text-blue-600">{stats.availableOperational}</div>
                    <PieChart className="w-5 h-5 text-blue-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-sm text-gray-700 mt-2 font-medium">Operativas</div>
                </button>
                <button
                  onClick={() => handleChartClick('administrative')}
                  className="text-center border-l border-green-300 hover:bg-purple-50 rounded-lg p-3 transition-colors group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-5xl font-bold text-purple-600">{stats.availableAdministrative}</div>
                    <PieChart className="w-5 h-5 text-purple-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-sm text-gray-700 mt-2 font-medium">Administrativas</div>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Sedes ({sites.length})
          </h3>
          <p className="text-gray-600 text-sm mb-6">
            Seleccione una sede para ver sus analíticas detalladas y mapa
          </p>

          <div className="space-y-3">
            {sites.map(site => (
              <SiteCard
                key={site.id}
                site={site}
                expandedSite={expandedSite}
                onExpand={setExpandedSite}
                onSelect={setSelectedSite}
              />
            ))}

            {sites.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay sedes disponibles</p>
              </div>
            )}
          </div>
        </div>

        {stats && (
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <button
              onClick={() => setShowExecutiveSummary(!showExecutiveSummary)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Resumen Ejecutivo
              </h3>
              <ChevronDown
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  showExecutiveSummary ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showExecutiveSummary && (
              <div className="border-t bg-gradient-to-r from-blue-50 to-blue-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Capacidad Total:</span>
                      <span className="text-blue-800 ml-1">
                        {stats.totalWorkstations} estaciones ({stats.operationalWorkstations} op., {stats.administrativeWorkstations} adm.)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Fuerza Laboral:</span>
                      <span className="text-blue-800 ml-1">
                        {stats.totalEmployees} empleados en {stats.totalSites} sede{stats.totalSites !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Disponibilidad:</span>
                      <span className="text-blue-800 ml-1">
                        {stats.availableWorkstations} estaciones ({stats.availableOperational} op., {stats.availableAdministrative} adm.)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Utilización:</span>
                      <span className="text-blue-800 ml-1">
                        {stats.utilizationRate.toFixed(1)}% general (Op: {stats.utilizationRateOperational.toFixed(1)}%, Adm: {stats.utilizationRateAdministrative.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
                {stats.employeesByArea.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Top Áreas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {stats.employeesByArea.slice(0, 4).map(({ area, count }) => (
                        <div key={area} className="bg-white/50 rounded px-3 py-2">
                          <div className="text-xs text-gray-600">{area}</div>
                          <div className="text-sm font-semibold text-blue-900">{count} emp.</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
}

function PieChartSVG({ data }: { data: SiteAvailability[] }) {
  const size = 280;
  const center = size / 2;
  const radius = size / 2 - 10;

  let currentAngle = -90;
  const paths = data.map((item) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    currentAngle = endAngle;

    return { path, color: item.color, percentage: item.percentage };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      {paths.map((item, index) => (
        <g key={index}>
          <path
            d={item.path}
            fill={item.color}
            stroke="white"
            strokeWidth="2"
            className="hover:opacity-80 transition-opacity"
          />
        </g>
      ))}
    </svg>
  );
}

function SiteCard({
  site,
  expandedSite,
  onExpand,
  onSelect,
}: {
  site: Site;
  expandedSite: string | null;
  onExpand: (id: string | null) => void;
  onSelect: (site: Site) => void;
}) {
  const [siteStats, setSiteStats] = useState<any>(null);

  useEffect(() => {
    if (expandedSite === site.id) {
      loadSiteStats();
    }
  }, [expandedSite]);

  const loadSiteStats = async () => {
    const { data: ws } = await supabase
      .from('workstations')
      .select('*, workstation_types(is_administrative, is_operational)')
      .eq('site_id', site.id);

    const { data: emps } = await supabase
      .from('employees')
      .select('*')
      .eq('site_id', site.id);

    const workstations = ws || [];
    const employees = emps || [];

    const administrativeCount = workstations.filter(w => (w.workstation_types as any)?.is_administrative === true).length;
    const operationalCount = workstations.filter(w => (w.workstation_types as any)?.is_operational === true).length;

    const availableOperational = workstations.filter(w => w.status === 'available' && (w.workstation_types as any)?.is_operational === true).length;
    const availableAdministrative = workstations.filter(w => w.status === 'available' && (w.workstation_types as any)?.is_administrative === true).length;

    const assignedCount = workstations.filter(w => w.status === 'assigned').length;
    const utilizationRate = workstations.length > 0 ? (assignedCount / workstations.length) * 100 : 0;
    const utilizationRateOperational = operationalCount > 0
      ? (workstations.filter(w => w.status === 'assigned' && (w.workstation_types as any)?.is_operational === true).length / operationalCount) * 100
      : 0;
    const utilizationRateAdministrative = administrativeCount > 0
      ? (workstations.filter(w => w.status === 'assigned' && (w.workstation_types as any)?.is_administrative === true).length / administrativeCount) * 100
      : 0;

    const areaMap = new Map<string, number>();
    employees.forEach(e => {
      const area = e.area || 'Sin área';
      areaMap.set(area, (areaMap.get(area) || 0) + 1);
    });

    setSiteStats({
      totalWorkstations: workstations.length,
      available: workstations.filter(w => w.status === 'available').length,
      availableOperational,
      availableAdministrative,
      assigned: assignedCount,
      maintenance: workstations.filter(w => w.status === 'maintenance').length,
      administrative: administrativeCount,
      operational: operationalCount,
      totalEmployees: employees.length,
      maleEmployees: employees.filter(e => e.gender === 'masculino').length,
      femaleEmployees: employees.filter(e => e.gender === 'femenino').length,
      utilizationRate,
      utilizationRateOperational,
      utilizationRateAdministrative,
      employeesByArea: Array.from(areaMap.entries()).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count).slice(0, 3),
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-lg">{site.name}</h4>
              <p className="text-sm text-gray-600">
                {site.city && site.country ? `${site.city}, ${site.country}` : site.city || site.country || 'Sin ubicación'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(site)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Ver Mapa
            </button>
            <button
              onClick={() => onExpand(expandedSite === site.id ? null : site.id)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${expandedSite === site.id ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {expandedSite === site.id && (
        <div className="p-6 bg-white border-t">
          {siteStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                  <div className="text-2xl font-bold text-slate-700">{siteStats.totalWorkstations}</div>
                  <div className="text-xs text-gray-600 mt-1">Estaciones Totales</div>
                  <div className="text-xs text-gray-500 mt-1">{siteStats.operational} Op. / {siteStats.administrative} Adm.</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{siteStats.available}</div>
                  <div className="text-xs text-gray-600 mt-1">Disponibles</div>
                  <div className="text-xs text-gray-500 mt-1">{siteStats.availableOperational} Op. / {siteStats.availableAdministrative} Adm.</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{siteStats.utilizationRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600 mt-1">Utilización</div>
                  <div className="text-xs text-gray-500 mt-1">Op: {siteStats.utilizationRateOperational.toFixed(1)}% / Adm: {siteStats.utilizationRateAdministrative.toFixed(1)}%</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700">{siteStats.totalEmployees}</div>
                  <div className="text-xs text-gray-600 mt-1">Empleados</div>
                  {siteStats.totalEmployees > 0 && (
                    <div className="text-xs text-gray-500 mt-1">{siteStats.maleEmployees} H / {siteStats.femaleEmployees} M</div>
                  )}
                </div>
              </div>
              {siteStats.employeesByArea.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Top Áreas</div>
                  <div className="grid grid-cols-3 gap-2">
                    {siteStats.employeesByArea.map(({ area, count }) => (
                      <div key={area} className="flex justify-between text-xs">
                        <span className="text-gray-600 truncate mr-2">{area}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
