import { useState, useEffect } from 'react';
import { useWorkstations, useSites, useEmployees, useWorkstationTypes } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { Plus, Filter, Monitor, ArrowUpDown, Settings2, X, Box, ListChecks, Trash2, Edit, History } from 'lucide-react';
import WorkstationDetail from './WorkstationDetail';
import WorkstationTypes from './WorkstationTypes';
import { useAuthorization } from '../hooks/useAuthorization';
import { MODULE_KEYS } from '../lib/moduleKeys';
import type { WorkstationWithDetails } from '../lib/database.types';

type SortField = 'asset_tag' | 'type' | 'site' | 'employee' | 'status';
type SortOrder = 'asc' | 'desc';
type Tab = 'workstations' | 'types';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

interface FilterConfig {
  id: string;
  label: string;
  enabled: boolean;
}

export default function Workstations() {
  const { workstations, loading, refetch } = useWorkstations();
  const { sites } = useSites();
  const { employees } = useEmployees();
  const { types } = useWorkstationTypes();
  const { permissions, loading: permissionsLoading } = useAuthorization(MODULE_KEYS.workstations);
  const [activeTab, setActiveTab] = useState<Tab>('workstations');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [assetTagSearch, setAssetTagSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('asset_tag');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilterSelector, setShowFilterSelector] = useState(false);
  const [selectedWorkstation, setSelectedWorkstation] = useState<WorkstationWithDetails | null>(null);
  const [editingWorkstation, setEditingWorkstation] = useState<WorkstationWithDetails | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [pageSize, setPageSize] = useState(20);

  const defaultColumns: ColumnConfig[] = [
    { id: 'asset_tag', label: 'Asset Tag', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'site', label: 'Site', visible: true },
    { id: 'floor', label: 'Floor', visible: true },
    { id: 'employee', label: 'Assigned To', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'actions', label: 'Actions', visible: true },
  ];

  const defaultFilters: FilterConfig[] = [
    { id: 'search', label: 'Asset Tag Search', enabled: true },
    { id: 'status', label: 'Status Filter', enabled: true },
    { id: 'city', label: 'City Filter', enabled: true },
    { id: 'site', label: 'Site Filter', enabled: true },
    { id: 'employee', label: 'Employee Filter', enabled: true },
  ];

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('workstations_columns');
    return saved ? JSON.parse(saved) : defaultColumns;
  });

  const [filters, setFilters] = useState<FilterConfig[]>(() => {
    const saved = localStorage.getItem('workstations_filters');
    return saved ? JSON.parse(saved) : defaultFilters;
  });

  useEffect(() => {
    localStorage.setItem('workstations_columns', JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    localStorage.setItem('workstations_filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (cityFilter !== 'all' && siteFilter !== 'all') {
      const selectedSite = sites.find(s => s.id === siteFilter);
      if (!selectedSite || selectedSite.city !== cityFilter) {
        setSiteFilter('all');
      }
    }
  }, [cityFilter, siteFilter, sites]);

  useEffect(() => {
    if (employeeFilter !== 'all' && employeeFilter !== '') {
      const selectedEmployee = employees.find(e => e.id === employeeFilter);
      if (!selectedEmployee) return;

      if (cityFilter !== 'all' && selectedEmployee.city !== cityFilter) {
        setEmployeeFilter('all');
      } else if (siteFilter !== 'all' && selectedEmployee.site_id !== siteFilter) {
        setEmployeeFilter('all');
      }
    }
  }, [cityFilter, siteFilter, employeeFilter, employees]);

  const toggleColumn = (id: string) => {
    setColumns(columns.map(col => col.id === id ? { ...col, visible: !col.visible } : col));
  };

  const toggleFilter = (id: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(w => w.id));
    }
  };

  const handleBulkUpdate = async (updates: any) => {
    for (const id of selectedIds) {
      await supabase.from('workstations').update(updates).eq('id', id);
    }
    setSelectedIds([]);
    setShowBulkUpdate(false);
    setBulkSelectMode(false);
    refetch();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} workstation(s)? This action cannot be undone.`)) {
      return;
    }
    for (const id of selectedIds) {
      await supabase.from('workstations').delete().eq('id', id);
    }
    setSelectedIds([]);
    setBulkSelectMode(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workstation? This action cannot be undone.')) {
      return;
    }
    await supabase.from('workstations').delete().eq('id', id);
    refetch();
  };

  const uniqueCities = Array.from(new Set(sites.map(s => s.city).filter(Boolean))).sort();

  const filteredSites = cityFilter === 'all'
    ? sites
    : sites.filter(s => s.city === cityFilter);

  const filteredEmployees = employees.filter(emp => {
    if (cityFilter !== 'all' && emp.city !== cityFilter) return false;
    if (siteFilter !== 'all' && emp.site_id !== siteFilter) return false;
    return true;
  });

  const filtered = workstations.filter(w => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (siteFilter !== 'all' && w.site_id !== siteFilter) return false;
    if (cityFilter !== 'all') {
      const site = sites.find(s => s.id === w.site_id);
      if (!site || site.city !== cityFilter) return false;
    }
    if (employeeFilter !== 'all' && w.assigned_to !== employeeFilter) return false;
    if (assetTagSearch && !w.asset_tag?.toLowerCase().includes(assetTagSearch.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    let compareA: string | number = '';
    let compareB: string | number = '';

    switch (sortField) {
      case 'asset_tag':
        compareA = a.asset_tag || '';
        compareB = b.asset_tag || '';
        break;
      case 'type':
        compareA = a.workstation_types?.name || '';
        compareB = b.workstation_types?.name || '';
        break;
      case 'site':
        compareA = a.sites?.name || '';
        compareB = b.sites?.name || '';
        break;
      case 'employee':
        compareA = a.employees?.name || '';
        compareB = b.employees?.name || '';
        break;
      case 'status':
        compareA = a.status || '';
        compareB = b.status || '';
        break;
    }

    if (sortOrder === 'asc') {
      return compareA > compareB ? 1 : -1;
    } else {
      return compareA < compareB ? 1 : -1;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-gray-100 text-gray-800';
      case 'out_of_service': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddWorkstation = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await supabase.from('workstations').insert({
      asset_tag: formData.get('asset_tag') as string,
      workstation_type_id: formData.get('workstation_type_id') as string || null,
      site_id: formData.get('site_id') as string || null,
      floor: parseInt(formData.get('floor') as string) || 0,
    });
    refetch();
    setShowAddForm(false);
  };

  if (loading || permissionsLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  if (!permissions.canList && activeTab === 'workstations') {
    return (
      <div className="text-center py-12">
        <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
        <p className="text-gray-500">You don't have permission to view workstations</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Workstations</h1>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('workstations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'workstations'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Workstations
            </button>
            <button
              onClick={() => setActiveTab('types')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'types'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Box className="w-4 h-4" />
              Types
            </button>
          </div>
        </div>
        {activeTab === 'workstations' && (
          <div className="flex gap-2">
            {permissions.canEdit && (
              <button
                onClick={() => {
                  setBulkSelectMode(!bulkSelectMode);
                  if (bulkSelectMode) {
                    setSelectedIds([]);
                  }
                }}
                className={`flex gap-2 px-4 py-2 rounded-lg border ${
                  bulkSelectMode ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 hover:bg-gray-50'
                }`}
                title="Bulk Update Mode"
              >
                <ListChecks className="w-5 h-5" />
                {bulkSelectMode && selectedIds.length > 0 && `(${selectedIds.length})`}
              </button>
            )}
            {bulkSelectMode && selectedIds.length > 0 && (
              <>
                {permissions.canEdit && (
                  <button
                    onClick={() => setShowBulkUpdate(true)}
                    className="flex gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Update Selected
                  </button>
                )}
                {permissions.canDelete && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Selected
                  </button>
                )}
              </>
            )}
            {permissions.canEdit && (
              <button onClick={() => setShowAddForm(true)} className="flex gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Plus className="w-5 h-5" />Add Workstation
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'types' ? (
        <WorkstationTypes />
      ) : (
        <>

      <div className="bg-white rounded-lg shadow border p-4 space-y-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowFilterSelector(!showFilterSelector)}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
              title="Configure Filters"
            >
              <Filter className="w-5 h-5" />
            </button>
            {showFilterSelector && (
              <div className="absolute left-0 mt-2 bg-white border rounded-lg shadow-lg p-3 space-y-2 z-10 min-w-[200px]">
                <div className="flex justify-between items-center mb-2 pb-2 border-b">
                  <span className="font-semibold text-sm">Active Filters</span>
                  <button onClick={() => setShowFilterSelector(false)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {filters.map(filter => (
                  <label key={filter.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filter.enabled}
                      onChange={() => toggleFilter(filter.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{filter.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {filters.find(f => f.id === 'search')?.enabled && (
            <input
              type="text"
              placeholder="Search by asset tag..."
              value={assetTagSearch}
              onChange={(e) => setAssetTagSearch(e.target.value)}
              className="px-3 py-2 border rounded-lg flex-1 min-w-[200px]"
            />
          )}

          {filters.find(f => f.id === 'status')?.enabled && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="pending">Pending</option>
              <option value="unavailable">Unavailable</option>
              <option value="out_of_service">Out of Service</option>
            </select>
          )}

          {filters.find(f => f.id === 'city')?.enabled && (
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="all">All Cities</option>
              {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          )}

          {filters.find(f => f.id === 'site')?.enabled && (
            <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="all">All Sites</option>
              {filteredSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          {filters.find(f => f.id === 'employee')?.enabled && (
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="all">All Employees</option>
              <option value="">Unassigned</option>
              {filteredEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          )}

          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Settings2 className="w-4 h-4" />
              Columns
            </button>
            {showColumnSelector && (
              <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg p-3 space-y-2 z-10 min-w-[200px]">
                <div className="flex justify-between items-center mb-2 pb-2 border-b">
                  <span className="font-semibold text-sm">Show Columns</span>
                  <button onClick={() => setShowColumnSelector(false)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {columns.map(col => (
                  <label key={col.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumn(col.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Showing {Math.min(pageSize, filtered.length)} of {filtered.length} workstations</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {bulkSelectMode && (
                <th className="px-6 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.find(c => c.id === 'asset_tag')?.visible && (
                <th className="text-left px-6 py-3 text-sm font-semibold">
                  <button onClick={() => handleSort('asset_tag')} className="flex items-center gap-1 hover:text-blue-600">
                    Asset Tag
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'asset_tag' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'type')?.visible && (
                <th className="text-left px-6 py-3 text-sm font-semibold">
                  <button onClick={() => handleSort('type')} className="flex items-center gap-1 hover:text-blue-600">
                    Type
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'type' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'site')?.visible && (
                <th className="text-left px-6 py-3 text-sm font-semibold">
                  <button onClick={() => handleSort('site')} className="flex items-center gap-1 hover:text-blue-600">
                    Site
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'site' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'floor')?.visible && (
                <th className="text-left px-6 py-3 text-sm font-semibold">
                  Floor
                </th>
              )}
              {columns.find(c => c.id === 'employee')?.visible && (
                <th className="text-left px-6 py-3 text-sm font-semibold">
                  <button onClick={() => handleSort('employee')} className="flex items-center gap-1 hover:text-blue-600">
                    Assigned To
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'employee' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'status')?.visible && (
                <th className="text-left px-6 py-3 text-sm font-semibold">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-blue-600">
                    Status
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'status' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'actions')?.visible && (
                <th className="text-right px-6 py-3 text-sm font-semibold">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.slice(0, pageSize).map(ws => (
              <tr key={ws.id} className="hover:bg-gray-50">
                {bulkSelectMode && (
                  <td className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(ws.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelection(ws.id);
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                )}
                {columns.find(c => c.id === 'asset_tag')?.visible && (
                  <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedWorkstation(ws)}>
                    <div className="flex gap-2">
                      <Monitor className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{ws.asset_tag || 'No Tag'}</span>
                    </div>
                  </td>
                )}
                {columns.find(c => c.id === 'type')?.visible && (
                  <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedWorkstation(ws)}>{ws.workstation_types?.name || '-'}</td>
                )}
                {columns.find(c => c.id === 'site')?.visible && (
                  <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedWorkstation(ws)}>{ws.sites?.name || '-'}</td>
                )}
                {columns.find(c => c.id === 'floor')?.visible && (
                  <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedWorkstation(ws)}>
                    {ws.floor === 0 ? 'Ground Floor' : ws.floor > 0 ? `Floor ${ws.floor}` : `Basement ${Math.abs(ws.floor)}`}
                  </td>
                )}
                {columns.find(c => c.id === 'employee')?.visible && (
                  <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedWorkstation(ws)}>{ws.employees?.name || '-'}</td>
                )}
                {columns.find(c => c.id === 'status')?.visible && (
                  <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedWorkstation(ws)}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ws.status)}`}>{ws.status}</span>
                  </td>
                )}
                {columns.find(c => c.id === 'actions')?.visible && (
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      {ws.asset_tag && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkstation(ws);
                          }}
                          className="p-2 hover:bg-purple-50 rounded"
                          title="View details"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWorkstation(ws);
                          }}
                          className="p-2 hover:bg-blue-50 rounded"
                          title="Edit workstation"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ws.id);
                          }}
                          className="p-2 hover:bg-red-50 rounded text-red-600"
                          title="Delete workstation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No workstations found</h3>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {Math.min(pageSize, filtered.length)} of {filtered.length} records
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Records per page:</span>
              <button
                onClick={() => setPageSize(20)}
                className={`px-3 py-1 text-sm rounded ${
                  pageSize === 20 ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-100'
                }`}
              >
                20
              </button>
              <button
                onClick={() => setPageSize(40)}
                className={`px-3 py-1 text-sm rounded ${
                  pageSize === 40 ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-100'
                }`}
              >
                40
              </button>
              <button
                onClick={() => setPageSize(80)}
                className={`px-3 py-1 text-sm rounded ${
                  pageSize === 80 ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-100'
                }`}
              >
                80
              </button>
              <button
                onClick={() => setPageSize(100)}
                className={`px-3 py-1 text-sm rounded ${
                  pageSize === 100 ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-100'
                }`}
              >
                100
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedWorkstation && <WorkstationDetail workstation={selectedWorkstation} onClose={() => { setSelectedWorkstation(null); refetch(); }} />}
      {editingWorkstation && <WorkstationDetail workstation={editingWorkstation} initiallyEditing={true} onClose={() => { setEditingWorkstation(null); refetch(); }} />}

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="border-b px-6 py-4"><h2 className="text-xl font-bold">Add Workstation</h2></div>
            <form onSubmit={handleAddWorkstation} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag *</label>
                  <input name="asset_tag" placeholder="Asset Tag" required className="w-full px-3 py-2 border rounded-lg" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workstation Type</label>
                  <select name="workstation_type_id" className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select Type</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                  <select name="site_id" className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select Site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                  <select name="floor" className="w-full px-3 py-2 border rounded-lg">
                    <option value="0">Ground Floor</option>
                    <option value="1">Floor 1</option>
                    <option value="2">Floor 2</option>
                    <option value="3">Floor 3</option>
                    <option value="4">Floor 4</option>
                    <option value="5">Floor 5</option>
                    <option value="-1">Basement 1</option>
                    <option value="-2">Basement 2</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUpdate && <BulkUpdateModal
        count={selectedIds.length}
        sites={sites}
        employees={employees}
        types={types}
        allWorkstations={workstations}
        selectedIds={selectedIds}
        onUpdate={handleBulkUpdate}
        onClose={() => setShowBulkUpdate(false)}
      />}
        </>
      )}
    </div>
  );
}

function BulkUpdateModal({ count, sites, employees, types, allWorkstations, selectedIds, onUpdate, onClose }: {
  count: number;
  sites: any[];
  employees: any[];
  types: any[];
  allWorkstations: WorkstationWithDetails[];
  selectedIds: string[];
  onUpdate: (updates: any) => void;
  onClose: () => void;
}) {
  const [updates, setUpdates] = useState<any>({});

  const getAvailableEmployees = () => {
    const assignedEmployeeIds = allWorkstations
      .filter(ws => ws.assigned_to && !selectedIds.includes(ws.id))
      .map(ws => ws.assigned_to);

    return employees.filter(e => !assignedEmployeeIds.includes(e.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpdates: any = {};
    if (updates.site_id) cleanUpdates.site_id = updates.site_id;
    if (updates.status) cleanUpdates.status = updates.status;
    if (updates.assigned_to !== undefined) cleanUpdates.assigned_to = updates.assigned_to || null;
    if (updates.floor !== undefined) cleanUpdates.floor = parseInt(updates.floor);
    if (updates.workstation_type_id !== undefined) cleanUpdates.workstation_type_id = updates.workstation_type_id || null;
    if (updates.rotation !== undefined) cleanUpdates.rotation = parseInt(updates.rotation);
    if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;
    if (updates.unavailable_reason !== undefined) cleanUpdates.unavailable_reason = updates.unavailable_reason;
    onUpdate(cleanUpdates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b px-6 py-4 flex justify-between">
          <h2 className="text-xl font-bold">Bulk Update ({count} items)</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Only filled fields will be updated. Leave blank to keep existing values.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Status updates automatically for automatic statuses (available, assigned, maintenance). Manual statuses prevent employee assignment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workstation Type</label>
              <select
                value={updates.workstation_type_id === null ? 'unassign' : (updates.workstation_type_id || '')}
                onChange={(e) => setUpdates({ ...updates, workstation_type_id: e.target.value === 'unassign' ? null : (e.target.value || undefined) })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Keep current</option>
                <option value="unassign">Unassign</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={updates.status || ''}
                onChange={(e) => setUpdates({ ...updates, status: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Keep current</option>
                <optgroup label="Automatic Status">
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="maintenance">Maintenance</option>
                </optgroup>
                <optgroup label="Manual Status">
                  <option value="pending">Pending</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="out_of_service">Out of Service</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <select
                value={updates.site_id || ''}
                onChange={(e) => setUpdates({ ...updates, site_id: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Keep current</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Employee</label>
              <select
                value={updates.assigned_to === null ? 'unassign' : (updates.assigned_to || '')}
                onChange={(e) => setUpdates({ ...updates, assigned_to: e.target.value === 'unassign' ? null : (e.target.value || undefined) })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Keep current</option>
                <option value="unassign">Unassign</option>
                {getAvailableEmployees().map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              {getAvailableEmployees().length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No hay empleados disponibles sin puesto asignado</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
              <select
                value={updates.floor !== undefined ? updates.floor : ''}
                onChange={(e) => setUpdates({ ...updates, floor: e.target.value || undefined })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Keep current</option>
                <option value="0">Ground Floor</option>
                <option value="1">Floor 1</option>
                <option value="2">Floor 2</option>
                <option value="3">Floor 3</option>
                <option value="4">Floor 4</option>
                <option value="5">Floor 5</option>
                <option value="-1">Basement 1</option>
                <option value="-2">Basement 2</option>
              </select>
            </div>

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              placeholder="Keep current if empty"
              value={updates.notes !== undefined ? updates.notes : ''}
              onChange={(e) => setUpdates({ ...updates, notes: e.target.value || undefined })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unavailable Reason</label>
            <input
              type="text"
              placeholder="Keep current if empty"
              value={updates.unavailable_reason !== undefined ? updates.unavailable_reason : ''}
              onChange={(e) => setUpdates({ ...updates, unavailable_reason: e.target.value || undefined })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Update {count} items</button>
          </div>
        </form>
      </div>
    </div>
  );
}
