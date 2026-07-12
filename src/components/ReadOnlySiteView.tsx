import { useState, useEffect } from 'react';
import { useWorkstations, useMapElements, useEmployees } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import MapCanvas from './map/MapCanvas';
import { MapPin, Users, Monitor, BarChart3, Building2, Grid, PieChart, TrendingUp, ChevronDown, X } from 'lucide-react';
import type { Site } from '../lib/database.types';

interface AnalyticsData {
  totalWorkstations: number;
  availableWorkstations: number;
  availableOperational: number;
  availableAdministrative: number;
  assignedWorkstations: number;
  maintenanceWorkstations: number;
  pendingWorkstations: number;
  unavailableWorkstations: number;
  outOfServiceWorkstations: number;
  workstationsByType: { type: string; count: number }[];
  totalEmployees: number;
  maleEmployees: number;
  femaleEmployees: number;
  unspecifiedGenderEmployees: number;
  workstationsByFloor: { floor: number; count: number }[];
  employeesByArea: { area: string; count: number }[];
  utilizationRate: number;
  utilizationRateOperational: number;
  utilizationRateAdministrative: number;
  administrativeWorkstations: number;
  operationalWorkstations: number;
}

interface FloorDetails {
  floor: number;
  totalWorkstations: number;
  operationalWorkstations: number;
  administrativeWorkstations: number;
  availableWorkstations: number;
  availableOperational: number;
  availableAdministrative: number;
  assignedWorkstations: number;
  assignedOperational: number;
  assignedAdministrative: number;
  utilizationRate: number;
  utilizationRateOperational: number;
  utilizationRateAdministrative: number;
  totalEmployees: number;
  employeesByArea: { area: string; count: number }[];
  maleEmployees: number;
  femaleEmployees: number;
  workstationTypeBreakdown: { type: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
}

interface Props {
  siteId: string;
}

export default function ReadOnlySiteView({ siteId }: Props) {
  const { workstations } = useWorkstations(siteId);
  const { elements } = useMapElements(siteId);
  const { employees } = useEmployees();
  const [site, setSite] = useState<Site | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'analytics'>('map');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [showTeamMembers, setShowTeamMembers] = useState(false);
  const [selectedFloorForDetails, setSelectedFloorForDetails] = useState<number | null>(null);
  const [floorDetails, setFloorDetails] = useState<FloorDetails | null>(null);

  const availableFloors = Array.from(new Set(workstations.map(ws => ws.floor || 0))).sort((a, b) => a - b);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  useEffect(() => {
    if (availableFloors.length > 0 && selectedFloor === null) {
      setSelectedFloor(availableFloors[0]);
    }
  }, [availableFloors]);

  const filteredWorkstations = workstations.filter(ws => (ws.floor || 0) === (selectedFloor ?? 0));
  const filteredElements = elements.filter(el => (el.floor || 0) === (selectedFloor ?? 0));

  const siteEmployees = employees.filter(emp => emp.site_id === siteId);

  useEffect(() => {
    loadSite();
  }, [siteId]);

  useEffect(() => {
    if (workstations.length > 0 || employees.length > 0) {
      loadAnalytics();
    }
  }, [workstations, employees, siteId]);

  const loadSite = async () => {
    const { data } = await supabase.from('sites').select('*').eq('id', siteId).maybeSingle();
    if (data) setSite(data);
    setLoading(false);
  };

  const loadFloorDetails = async (floor: number) => {
    try {
      const { data: workstations } = await supabase
        .from('workstations')
        .select('*, workstation_types(name, is_administrative, is_operational)')
        .eq('site_id', siteId)
        .eq('floor', floor);

      const ws = workstations || [];
      const assignedWorkstationIds = ws.filter(w => w.assigned_to).map(w => w.assigned_to);
      const emps = employees.filter(e => assignedWorkstationIds.includes(e.id));

      const operationalCount = ws.filter(w => (w.workstation_types as any)?.is_operational === true).length;
      const administrativeCount = ws.filter(w => (w.workstation_types as any)?.is_administrative === true).length;

      const availableOperational = ws.filter(w => w.status === 'available' && (w.workstation_types as any)?.is_operational === true).length;
      const availableAdministrative = ws.filter(w => w.status === 'available' && (w.workstation_types as any)?.is_administrative === true).length;

      const assignedOperational = ws.filter(w => w.status === 'assigned' && (w.workstation_types as any)?.is_operational === true).length;
      const assignedAdministrative = ws.filter(w => w.status === 'assigned' && (w.workstation_types as any)?.is_administrative === true).length;

      const utilizationRate = ws.length > 0 ? (ws.filter(w => w.status === 'assigned').length / ws.length) * 100 : 0;
      const utilizationRateOperational = operationalCount > 0 ? (assignedOperational / operationalCount) * 100 : 0;
      const utilizationRateAdministrative = administrativeCount > 0 ? (assignedAdministrative / administrativeCount) * 100 : 0;

      const areaMap = new Map<string, number>();
      emps.forEach(e => {
        const area = e.area || 'Sin área';
        areaMap.set(area, (areaMap.get(area) || 0) + 1);
      });

      const typeMap = new Map<string, number>();
      ws.forEach(w => {
        const typeName = (w.workstation_types as any)?.name || 'Sin tipo';
        typeMap.set(typeName, (typeMap.get(typeName) || 0) + 1);
      });

      const statusMap = new Map<string, number>();
      ws.forEach(w => {
        const statusName = w.status || 'unknown';
        statusMap.set(statusName, (statusMap.get(statusName) || 0) + 1);
      });

      setFloorDetails({
        floor,
        totalWorkstations: ws.length,
        operationalWorkstations: operationalCount,
        administrativeWorkstations: administrativeCount,
        availableWorkstations: ws.filter(w => w.status === 'available').length,
        availableOperational,
        availableAdministrative,
        assignedWorkstations: ws.filter(w => w.status === 'assigned').length,
        assignedOperational,
        assignedAdministrative,
        utilizationRate,
        utilizationRateOperational,
        utilizationRateAdministrative,
        totalEmployees: emps.length,
        employeesByArea: Array.from(areaMap.entries()).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
        maleEmployees: emps.filter(e => e.gender === 'masculino').length,
        femaleEmployees: emps.filter(e => e.gender === 'femenino').length,
        workstationTypeBreakdown: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        statusBreakdown: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
      });
      setSelectedFloorForDetails(floor);
    } catch (error) {
      console.error('Error loading floor details:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data: workstationsData } = await supabase
        .from('workstations')
        .select('*, workstation_types(name, is_administrative, is_operational)')
        .eq('site_id', siteId);

      const ws = workstationsData || [];
      const emps = employees.filter(e => e.site_id === siteId);

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

      const floorMap = new Map<number, number>();
      ws.forEach(w => {
        floorMap.set(w.floor, (floorMap.get(w.floor) || 0) + 1);
      });

      const areaMap = new Map<string, number>();
      emps.forEach(e => {
        const area = e.area || 'Sin área';
        areaMap.set(area, (areaMap.get(area) || 0) + 1);
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
        workstationsByType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
        totalEmployees: emps.length,
        maleEmployees: genderCounts.male,
        femaleEmployees: genderCounts.female,
        unspecifiedGenderEmployees: genderCounts.unspecified,
        workstationsByFloor: Array.from(floorMap.entries()).map(([floor, count]) => ({ floor, count })).sort((a, b) => a.floor - b.floor),
        employeesByArea: Array.from(areaMap.entries()).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
        utilizationRate,
        utilizationRateOperational,
        utilizationRateAdministrative,
        administrativeWorkstations: administrativeCount,
        operationalWorkstations: operationalCount,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const getStatusStats = () => {
    const stats = {
      available: 0,
      assigned: 0,
      maintenance: 0,
      pending: 0,
      unavailable: 0,
      out_of_service: 0
    };
    workstations.forEach(ws => {
      if (ws.status in stats) {
        stats[ws.status as keyof typeof stats]++;
      }
    });
    return stats;
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sede...</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sede no encontrada</h2>
          <p className="text-gray-600">La sede que buscas no existe o ha sido eliminada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                {site.city && <span>{site.city}</span>}
                {site.country && <span>{site.country}</span>}
                <span className="flex items-center gap-1">
                  <Monitor className="w-4 h-4" />
                  {workstations.length} estaciones
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {siteEmployees.length} empleados
                </span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <p className="text-amber-800 text-sm font-medium">Vista de Solo Lectura</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Plano del Piso
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analíticas
            </button>
          </div>
        </div>
      </div>

      {activeView === 'map' ? (
        <>
          <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
            {availableFloors.length > 1 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Piso:</label>
                <select
                  value={selectedFloor ?? 0}
                  onChange={(e) => setSelectedFloor(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableFloors.map(floor => (
                    <option key={floor} value={floor}>
                      {floor === 0 ? 'Planta Baja' : floor > 0 ? `Piso ${floor}` : `Sótano ${Math.abs(floor)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-4 text-sm">
              <span className="text-gray-600">
                {filteredWorkstations.length} estaciones en este piso
              </span>
            </div>
          </div>

          <div className="flex-1 relative bg-gray-100">
            <MapCanvas
              workstations={filteredWorkstations}
              elements={filteredElements}
              isReadOnly={true}
            />
          </div>

          <div className="bg-white border-t border-gray-200 px-6 py-3 flex gap-6 items-center text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Disponible ({stats.available})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Asignada ({stats.assigned})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Mantenimiento ({stats.maintenance})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Pendiente ({stats.pending})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span>No Disponible ({stats.unavailable})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Fuera de Servicio ({stats.out_of_service})</span>
            </div>
          </div>
        </>
      ) : analytics ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div className="space-y-3">
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

            {analytics.workstationsByFloor.length > 0 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Estaciones por Piso (Click para detalles)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analytics.workstationsByFloor.map(({ floor, count }) => (
                    <button
                      key={floor}
                      onClick={() => loadFloorDetails(floor)}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg p-4 text-center border border-blue-200 transition-all hover:shadow-md cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-blue-600">{count}</div>
                      <div className="text-sm text-gray-600">Piso {floor}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-900">Información Clave</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div>
                    <span className="font-medium text-blue-900">Capacidad:</span>
                    <span className="text-blue-800 ml-1">
                      {analytics.availableWorkstations} de {analytics.totalWorkstations} estaciones disponibles
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div>
                    <span className="font-medium text-blue-900">Personal:</span>
                    <span className="text-blue-800 ml-1">
                      {analytics.totalEmployees} empleados en total
                    </span>
                  </div>
                </div>
                {analytics.maintenanceWorkstations > 0 && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Mantenimiento:</span>
                      <span className="text-blue-800 ml-1">
                        {analytics.maintenanceWorkstations} estación{analytics.maintenanceWorkstations !== 1 ? 'es' : ''} en mantenimiento
                      </span>
                    </div>
                  </div>
                )}
                {analytics.totalEmployees > 0 && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                    <div>
                      <span className="font-medium text-blue-900">Relación de género:</span>
                      <span className="text-blue-800 ml-1">
                        {((analytics.maleEmployees / analytics.totalEmployees) * 100).toFixed(0)}% H /
                        {((analytics.femaleEmployees / analytics.totalEmployees) * 100).toFixed(0)}% M
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border p-6">
              <button
                onClick={() => setShowTeamMembers(!showTeamMembers)}
                className="w-full flex items-center justify-between cursor-pointer text-left"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Miembros del Equipo ({siteEmployees.length})
                </h3>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showTeamMembers ? 'rotate-180' : ''}`} />
              </button>
              {showTeamMembers && (
                <div className="mt-4">
                  {siteEmployees.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay empleados asignados a esta sede</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {siteEmployees.map(emp => (
                        <div key={emp.id} className="border rounded-lg p-4">
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{emp.position || 'Sin cargo'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Cargando analíticas...</p>
        </div>
      )}

      {selectedFloorForDetails !== null && floorDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex justify-between items-center bg-gradient-to-r from-slate-600 to-slate-700 text-white">
              <div>
                <h3 className="text-xl font-bold">Detalles del Piso {floorDetails.floor}</h3>
                <p className="text-sm text-slate-200">{site?.name}</p>
              </div>
              <button
                onClick={() => setSelectedFloorForDetails(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                    <div className="text-sm font-semibold text-slate-600 mb-2">Estaciones Totales</div>
                    <div className="text-3xl font-bold text-slate-700">{floorDetails.totalWorkstations}</div>
                    <div className="text-xs text-slate-500 mt-2">
                      <div>{floorDetails.operationalWorkstations} Operativas</div>
                      <div>{floorDetails.administrativeWorkstations} Administrativas</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="text-sm font-semibold text-green-700 mb-2">Disponibles</div>
                    <div className="text-3xl font-bold text-green-700">{floorDetails.availableWorkstations}</div>
                    <div className="text-xs text-gray-600 mt-2">
                      <div>{floorDetails.availableOperational} Operativas</div>
                      <div>{floorDetails.availableAdministrative} Administrativas</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="text-sm font-semibold text-blue-700 mb-2">Asignadas</div>
                    <div className="text-3xl font-bold text-blue-700">{floorDetails.assignedWorkstations}</div>
                    <div className="text-xs text-gray-600 mt-2">
                      <div>{floorDetails.assignedOperational} Operativas</div>
                      <div>{floorDetails.assignedAdministrative} Administrativas</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3">Tasa de Utilización</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-700">{floorDetails.utilizationRate.toFixed(1)}%</div>
                      <div className="text-xs text-purple-600 mt-1">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{floorDetails.utilizationRateOperational.toFixed(1)}%</div>
                      <div className="text-xs text-gray-600 mt-1">Operativas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{floorDetails.utilizationRateAdministrative.toFixed(1)}%</div>
                      <div className="text-xs text-gray-600 mt-1">Administrativas</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Empleados en este Piso</h4>
                    <div className="flex justify-between items-center mb-3 pb-3 border-b">
                      <span className="text-gray-600">Total</span>
                      <span className="text-2xl font-bold text-blue-600">{floorDetails.totalEmployees}</span>
                    </div>
                    {floorDetails.totalEmployees > 0 && (
                      <>
                        <div className="space-y-2 mb-3">
                          <div className="text-xs font-semibold text-gray-600">Por Género</div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Masculino</span>
                            <span className="font-medium">{floorDetails.maleEmployees}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Femenino</span>
                            <span className="font-medium">{floorDetails.femaleEmployees}</span>
                          </div>
                        </div>
                        {floorDetails.employeesByArea.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-600">Por Área</div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {floorDetails.employeesByArea.map(({ area, count }) => (
                                <div key={area} className="flex justify-between text-sm">
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

                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Tipos de Estaciones</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {floorDetails.workstationTypeBreakdown.map(({ type, count }) => (
                        <div key={type} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{type}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Estado de las Estaciones</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {floorDetails.statusBreakdown.map(({ status, count }) => {
                      const statusColors: Record<string, string> = {
                        available: 'bg-green-500',
                        assigned: 'bg-blue-500',
                        maintenance: 'bg-red-500',
                        pending: 'bg-yellow-500',
                        unavailable: 'bg-gray-500',
                        out_of_service: 'bg-orange-500',
                      };
                      const statusLabels: Record<string, string> = {
                        available: 'Disponibles',
                        assigned: 'Asignadas',
                        maintenance: 'Mantenimiento',
                        pending: 'Pendientes',
                        unavailable: 'No Disponibles',
                        out_of_service: 'Fuera de Servicio',
                      };
                      return (
                        <div key={status} className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${statusColors[status] || 'bg-gray-400'} rounded-full`}></div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-600">{statusLabels[status] || status}</div>
                            <div className="text-sm font-semibold">{count}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50">
              <button
                onClick={() => setSelectedFloorForDetails(null)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
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
