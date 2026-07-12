import { useWorkstations, useSites, useEmployees } from '../hooks/useData';
import { Monitor, MapPin, Users, CheckCircle, XCircle } from 'lucide-react';

export default function Dashboard() {
  const { workstations, loading } = useWorkstations();
  const { sites } = useSites();
  const { employees } = useEmployees();

  const available = workstations.filter(w => w.status === 'available').length;
  const assigned = workstations.filter(w => w.status === 'assigned').length;
  const notAvailable = workstations.filter(w => w.status === 'maintenance' || w.status === 'retired').length;

  const stats = [
    { label: 'Estaciones de Trabajo Totales', value: workstations.length, icon: Monitor, color: 'bg-blue-500' },
    { label: 'Disponibles', value: available, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Asignadas', value: assigned, icon: Users, color: 'bg-blue-500' },
    { label: 'No Disponibles', value: notAvailable, icon: XCircle, color: 'bg-red-500' },
    { label: 'Sedes Totales', value: sites.length, icon: MapPin, color: 'bg-sky-500' },
    { label: 'Empleados Totales', value: employees.length, icon: Users, color: 'bg-emerald-500' },
  ];

  if (loading) return <div className="text-center py-12 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Tablero de Control</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow border p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-semibold mb-4">Resumen de Estados</h2>
          <div className="space-y-4">
            {[
              { label: 'Disponibles', value: available, color: 'bg-green-500' },
              { label: 'Asignadas', value: assigned, color: 'bg-blue-500' },
              { label: 'No Disponibles', value: notAvailable, color: 'bg-red-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{width: `${(item.value / Math.max(workstations.length, 1)) * 100}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-semibold mb-4">Estaciones por Sede</h2>
          <div className="space-y-3">
            {sites.map(site => (
              <div key={site.id} className="flex justify-between py-2 border-b last:border-0">
                <span>{site.name}</span>
                <span className="font-semibold">{workstations.filter(w => w.site_id === site.id).length}</span>
              </div>
            ))}
            {sites.length === 0 && <p className="text-center text-gray-500 py-4">No hay sedes configuradas</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
