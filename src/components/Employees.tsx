import { useState, useEffect } from 'react';
import { useEmployees, useSites } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { Plus, CreditCard as Edit, Trash2, User, X, Filter, ArrowUpDown, Settings2, Upload, Download, History, ListChecks, UserCog } from 'lucide-react';
import SiteDetailModal from './SiteDetailModal';
import { useAuthorization } from '../hooks/useAuthorization';
import { MODULE_KEYS } from '../lib/moduleKeys';
import type { Employee, Site } from '../lib/database.types';

interface Company {
  id: string;
  name: string;
}

type SortField = 'name' | 'email' | 'position' | 'site' | 'status';
type SortOrder = 'asc' | 'desc';

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

export default function Employees() {
  const { employees, loading, refetch } = useEmployees();
  const { sites } = useSites();
  const { permissions, loading: permissionsLoading } = useAuthorization(MODULE_KEYS.employees);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [nameSearch, setNameSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [detailSite, setDetailSite] = useState<Site | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [showSingleUpdate, setShowSingleUpdate] = useState(false);
  const [singleUpdateEmployee, setSingleUpdateEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
  };

  const defaultColumns: ColumnConfig[] = [
    { id: 'name', label: 'Name', visible: true },
    { id: 'id_number', label: 'ID Number', visible: true },
    { id: 'email', label: 'Email', visible: true },
    { id: 'position', label: 'Position', visible: true },
    { id: 'city', label: 'City', visible: true },
    { id: 'area', label: 'Area', visible: true },
    { id: 'company', label: 'Sociedad', visible: true },
    { id: 'site', label: 'Site', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'actions', label: 'Actions', visible: true },
  ];

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('employees_columns');
    return saved ? JSON.parse(saved) : defaultColumns;
  });

  useEffect(() => {
    localStorage.setItem('employees_columns', JSON.stringify(columns));
  }, [columns]);

  const toggleColumn = (id: string) => {
    setColumns(columns.map(col => col.id === id ? { ...col, visible: !col.visible } : col));
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
      setSelectedIds(filtered.map(e => e.id));
    }
  };

  const handleBulkUpdate = async (updates: Partial<Employee>) => {
    for (const id of selectedIds) {
      await supabase.from('employees').update(updates).eq('id', id);
    }
    setSelectedIds([]);
    setShowBulkUpdate(false);
    refetch();
  };

  const handleSingleUpdate = async (updates: Partial<Employee>) => {
    if (!singleUpdateEmployee) return;
    await supabase.from('employees').update(updates).eq('id', singleUpdateEmployee.id);
    setSingleUpdateEmployee(null);
    setShowSingleUpdate(false);
    refetch();
  };

  const filtered = employees.filter(emp => {
    if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
    if (siteFilter !== 'all' && emp.site_id !== siteFilter) return false;
    if (nameSearch && !emp.name?.toLowerCase().includes(nameSearch.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    let compareA: string = '';
    let compareB: string = '';

    switch (sortField) {
      case 'name':
        compareA = a.name || '';
        compareB = b.name || '';
        break;
      case 'email':
        compareA = a.email || '';
        compareB = b.email || '';
        break;
      case 'position':
        compareA = a.position || '';
        compareB = b.position || '';
        break;
      case 'site':
        compareA = sites.find(s => s.id === a.site_id)?.name || '';
        compareB = sites.find(s => s.id === b.site_id)?.name || '';
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    await supabase.from('employees').delete().eq('id', id);
    refetch();
  };

  if (loading || permissionsLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  if (!permissions.canList) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
        <p className="text-gray-500">You don't have permission to view employees</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Employees</h1>
        <div className="flex gap-2">
          {permissions.canExport && (
            <button
              onClick={() => {
                const csv = 'name,email,position,city,area,id_type,id_number,phone,status,gender,site_id\nJohn Doe,john@example.com,Developer,Bogotá,Acme Corp,CC,1234567890,3001234567,active,Masculino,\nJane Smith,jane@example.com,Designer,Medellín,Design Team,CC,9876543210,3109876543,active,Femenino,\n';
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'employees_sample.csv';
                a.click();
              }}
              className="flex gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-5 h-5" />Sample CSV
            </button>
          )}
          {permissions.canImport && (
            <button
              onClick={() => setShowCSVUpload(true)}
              className="flex gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-5 h-5" />Upload CSV
            </button>
          )}
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
          {bulkSelectMode && selectedIds.length > 0 && permissions.canEdit && (
            <button
              onClick={() => setShowBulkUpdate(true)}
              className="flex gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Update Selected
            </button>
          )}
          {permissions.canEdit && (
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />Add Employee
            </button>
          )}

        </div>
      </div>

      <div className="bg-white rounded-lg shadow border p-4 space-y-4">
        <div className="flex gap-4 items-center flex-wrap">
          <Filter className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            className="px-3 py-2 border rounded-lg flex-1 min-w-[200px]"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">All Sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
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
          <span>Showing {Math.min(pageSize, filtered.length)} of {filtered.length} employees</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              {bulkSelectMode && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
              )}
              {columns.find(c => c.id === 'name')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[160px]">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-blue-600">
                    Name
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'name' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'id_number')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[120px]">ID Number</th>
              )}
              {columns.find(c => c.id === 'email')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[200px]">
                  <button onClick={() => handleSort('email')} className="flex items-center gap-1 hover:text-blue-600">
                    Email
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'email' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'position')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[130px]">
                  <button onClick={() => handleSort('position')} className="flex items-center gap-1 hover:text-blue-600">
                    Position
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'position' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'city')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[100px]">City</th>
              )}
              {columns.find(c => c.id === 'area')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[110px]">Area</th>
              )}
              {columns.find(c => c.id === 'company')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[120px]">Sociedad</th>
              )}
              {columns.find(c => c.id === 'site')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[120px]">
                  <button onClick={() => handleSort('site')} className="flex items-center gap-1 hover:text-blue-600">
                    Site
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'site' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'status')?.visible && (
                <th className="text-left px-4 py-3 text-sm font-semibold min-w-[100px]">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-blue-600">
                    Status
                    <ArrowUpDown className={`w-4 h-4 ${sortField === 'status' ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                </th>
              )}
              {columns.find(c => c.id === 'actions')?.visible && (
                <th className="text-right px-4 py-3 text-sm font-semibold min-w-[140px]">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.slice(0, pageSize).map(emp => {
              const site = sites.find(s => s.id === emp.site_id);
              const company = companies.find(c => c.id === emp.company_id);
              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  {bulkSelectMode && (
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelection(emp.id);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.find(c => c.id === 'name')?.visible && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 p-1.5 rounded-lg flex-shrink-0">
                          <User className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="font-medium text-sm">{emp.name}</span>
                      </div>
                    </td>
                  )}
                  {columns.find(c => c.id === 'id_number')?.visible && (
                    <td className="px-4 py-3 text-sm">{emp.id_number || '-'}</td>
                  )}
                  {columns.find(c => c.id === 'email')?.visible && (
                    <td className="px-4 py-3 text-sm">{emp.email}</td>
                  )}
                  {columns.find(c => c.id === 'position')?.visible && (
                    <td className="px-4 py-3 text-sm">{emp.position || '-'}</td>
                  )}
                  {columns.find(c => c.id === 'city')?.visible && (
                    <td className="px-4 py-3 text-sm">{emp.city || '-'}</td>
                  )}
                  {columns.find(c => c.id === 'area')?.visible && (
                    <td className="px-4 py-3 text-sm">{emp.area || '-'}</td>
                  )}
                  {columns.find(c => c.id === 'company')?.visible && (
                    <td className="px-4 py-3 text-sm">{company?.name || '-'}</td>
                  )}
                  {columns.find(c => c.id === 'site')?.visible && (
                    <td className="px-4 py-3 text-sm">
                      {site ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailSite(site);
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {site.name}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
                  {columns.find(c => c.id === 'status')?.visible && (
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}>{emp.status}</span>
                    </td>
                  )}
                  {columns.find(c => c.id === 'actions')?.visible && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {emp.id_number && (
                          <button
                            onClick={() => { setSelectedEmployeeId(emp.id_number); setShowHistory(true); }}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                            title="View history"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}
                        {permissions.canEdit && (
                          <>
                            <button
                              onClick={() => { setSingleUpdateEmployee(emp); setShowSingleUpdate(true); }}
                              className="p-1.5 hover:bg-amber-50 rounded text-amber-600 hover:text-amber-800"
                              title="Quick update (status / site / sociedad)"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditing(emp); setShowForm(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-600 hover:text-blue-800" title="Edit employee">
                              <Edit className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {permissions.canDelete && (
                          <button onClick={() => handleDelete(emp.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500 hover:text-red-700" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No employees found</h3>
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

      {showForm && <EmployeeForm employee={editing} sites={sites} companies={companies} onClose={() => { setShowForm(false); setEditing(null); refetch(); }} />}

      {showSingleUpdate && singleUpdateEmployee && (
        <EmployeeSingleUpdateModal
          employee={singleUpdateEmployee}
          sites={sites}
          companies={companies}
          onUpdate={handleSingleUpdate}
          onClose={() => { setShowSingleUpdate(false); setSingleUpdateEmployee(null); }}
        />
      )}

      {showBulkUpdate && <EmployeeBulkUpdateModal
        count={selectedIds.length}
        sites={sites}
        companies={companies}
        onUpdate={handleBulkUpdate}
        onClose={() => setShowBulkUpdate(false)}
      />}

      {showCSVUpload && <CSVUploadModal onClose={() => { setShowCSVUpload(false); refetch(); }} />}

      {showHistory && selectedEmployeeId && <EmployeeHistoryModal
        idNumber={selectedEmployeeId}
        onClose={() => { setShowHistory(false); setSelectedEmployeeId(null); }}
      />}

      {detailSite && <SiteDetailModal site={detailSite} onClose={() => setDetailSite(null)} />}
    </div>
  );
}

function EmployeeBulkUpdateModal({ count, sites, companies, onUpdate, onClose }: {
  count: number;
  sites: any[];
  companies: Company[];
  onUpdate: (updates: any) => void;
  onClose: () => void;
}) {
  const [updates, setUpdates] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpdates: any = {};
    if (updates.status) cleanUpdates.status = updates.status;
    if (updates.site_id !== undefined) cleanUpdates.site_id = updates.site_id || null;
    if (updates.company_id !== undefined) cleanUpdates.company_id = updates.company_id || null;
    if (updates.position !== undefined) cleanUpdates.position = updates.position;
    onUpdate(cleanUpdates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between">
          <h2 className="text-xl font-bold">Bulk Update ({count} items)</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Only filled fields will be updated. Leave blank to keep existing values.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={updates.status || ''}
              onChange={(e) => setUpdates({ ...updates, status: e.target.value || undefined })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Keep current</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sociedad</label>
            <select
              value={updates.company_id === null ? 'unassign' : (updates.company_id || '')}
              onChange={(e) => setUpdates({ ...updates, company_id: e.target.value === 'unassign' ? null : (e.target.value || undefined) })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Keep current</option>
              <option value="unassign">Unassign</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={updates.site_id === null ? 'unassign' : (updates.site_id || '')}
              onChange={(e) => setUpdates({ ...updates, site_id: e.target.value === 'unassign' ? null : (e.target.value || undefined) })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Keep current</option>
              <option value="unassign">Unassign</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              type="text"
              placeholder="Keep current if empty"
              value={updates.position || ''}
              onChange={(e) => setUpdates({ ...updates, position: e.target.value || undefined })}
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

function EmployeeSingleUpdateModal({ employee, sites, companies, onUpdate, onClose }: {
  employee: Employee;
  sites: any[];
  companies: Company[];
  onUpdate: (updates: any) => void;
  onClose: () => void;
}) {
  const [updates, setUpdates] = useState<any>({
    status: employee.status || '',
    site_id: employee.site_id || '',
    company_id: employee.company_id || '',
    position: employee.position || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpdates: any = {};
    if (updates.status) cleanUpdates.status = updates.status;
    cleanUpdates.site_id = updates.site_id || null;
    cleanUpdates.company_id = updates.company_id || null;
    if (updates.position !== undefined) cleanUpdates.position = updates.position;
    onUpdate(cleanUpdates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Quick Update</h2>
            <p className="text-sm text-gray-500 mt-0.5">{employee.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={updates.status}
              onChange={(e) => setUpdates({ ...updates, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              type="text"
              value={updates.position}
              onChange={(e) => setUpdates({ ...updates, position: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Position"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sociedad</label>
            <select
              value={updates.company_id}
              onChange={(e) => setUpdates({ ...updates, company_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select
              value={updates.site_id}
              onChange={(e) => setUpdates({ ...updates, site_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeForm({ employee, sites, companies, onClose }: { employee: Employee | null; sites: any[]; companies: Company[]; onClose: () => void }) {
  const [form, setForm] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    position: employee?.position || '',
    city: employee?.city || '',
    area: employee?.area || '',
    id_type: employee?.id_type || 'CC',
    id_number: employee?.id_number || '',
    company_id: employee?.company_id || '',
    site_id: employee?.site_id || '',
    phone: employee?.phone || '',
    status: employee?.status || 'active',
    gender: employee?.gender || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      company_id: form.company_id || null,
      site_id: form.site_id || null,
      gender: form.gender ? form.gender.toLowerCase() : null
    };
    if (employee) {
      await supabase.from('employees').update(data).eq('id', employee.id);
    } else {
      await supabase.from('employees').insert(data);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between">
          <h2 className="text-xl font-bold">{employee ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" placeholder="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
              <select value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="CC">CC - Cédula de Ciudadanía</option>
                <option value="PSP">PSP - Pasaporte</option>
                <option value="CE">CE - Cédula de Extranjería</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
              <input type="text" placeholder="ID Number" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input type="text" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
              <input type="text" placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sociedad</label>
            <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Seleccionar Sociedad</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <select value={form.site_id} onChange={(e) => setForm({ ...form, site_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
              <option value="">Select Site</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select Gender</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{employee ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CSVUploadModal({ onClose }: { onClose: () => void }) {
  const [csvData, setCSVData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[]; updated: number } | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCSVData(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const detectDelimiter = (firstLine: string): string => {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return ',';
  };

  const getErrorField = (errorMessage: string): string => {
    if (errorMessage.includes('employees_email_key')) return 'email (ya existe)';
    if (errorMessage.includes('employees_id_number_key')) return 'número de identificación (ya existe)';
    if (errorMessage.includes('gender')) return 'género (debe ser "masculino" o "femenino")';
    if (errorMessage.includes('site_id')) return 'sitio (ID no válido)';
    if (errorMessage.includes('status')) return 'estado (debe ser "active" o "inactive")';
    return 'error desconocido';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setProgress({ current: 0, total: 0 });
    const errors: string[] = [];
    let success = 0;
    let updated = 0;

    const lines = csvData.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      setResults({ success: 0, errors: ['El archivo CSV está vacío'], updated: 0 });
      setIsProcessing(false);
      return;
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const totalRecords = lines.length - 1;

    setProgress({ current: 0, total: totalRecords });

    console.log('CSV Delimiter:', delimiter);
    console.log('CSV Headers:', headers);

    for (let i = 1; i < lines.length; i++) {
      setProgress({ current: i, total: totalRecords });

      const values = parseCSVLine(lines[i], delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const employee: any = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (value && value !== '') {
          employee[header] = value;
        }
      });

      if (!employee.name || !employee.email) {
        const employeeName = employee.name || `Línea ${i + 1}`;
        const missingFields = [];
        if (!employee.name) missingFields.push('nombre');
        if (!employee.email) missingFields.push('email');
        errors.push(`${employeeName}: Faltan campos obligatorios (${missingFields.join(', ')})`);
        continue;
      }

      if (!employee.status) {
        employee.status = 'active';
      }

      if (employee.gender) {
        employee.gender = employee.gender.toLowerCase();
      }
      if (employee.gender === '') {
        employee.gender = null;
      }

      const { data: existing } = await supabase
        .from('employees')
        .select('*')
        .or(`email.eq.${employee.email}${employee.id_number ? `,id_number.eq.${employee.id_number}` : ''}`)
        .maybeSingle();

      if (existing) {
        const updateData = { ...employee };

        if (!employee.site_id && existing.site_id) {
          delete updateData.site_id;
        }

        const { error } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', existing.id);

        if (error) {
          const field = getErrorField(error.message);
          errors.push(`${employee.name}: No se pudo actualizar - problema con ${field}`);
        } else {
          updated++;
          success++;
        }
        continue;
      }

      const { error } = await supabase.from('employees').insert(employee);

      if (error) {
        const field = getErrorField(error.message);
        errors.push(`${employee.name}: No se pudo crear - problema con ${field}`);
      } else {
        success++;
      }
    }

    setResults({ success, errors, updated });
    setIsProcessing(false);
    setProgress({ current: totalRecords, total: totalRecords });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="border-b px-6 py-4 flex justify-between">
          <h2 className="text-xl font-bold">Upload CSV</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!results ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Expected format: name,email,position,city,area,id_type,id_number,phone,status,gender,site_id
                </p>
              </div>

              {csvData && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                  <div className="bg-gray-50 p-3 rounded-lg text-xs">
                    <div className="mb-2">
                      <strong>Detected Delimiter:</strong> {(() => {
                        const lines = csvData.split('\n').filter(line => line.trim());
                        if (lines.length === 0) return 'N/A';
                        const delimiter = detectDelimiter(lines[0]);
                        return delimiter === ',' ? 'Comma (,)' : delimiter === ';' ? 'Semicolon (;)' : 'Tab';
                      })()}
                    </div>
                    <div className="mb-2">
                      <strong>Headers found:</strong> {(() => {
                        const lines = csvData.split('\n').filter(line => line.trim());
                        if (lines.length === 0) return 'None';
                        const delimiter = detectDelimiter(lines[0]);
                        const headers = parseCSVLine(lines[0], delimiter);
                        return headers.join(', ');
                      })()}
                    </div>
                    <div>
                      <strong>First 3 lines:</strong>
                      <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all">
                        {csvData.split('\n').slice(0, 3).join('\n')}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {isProcessing && progress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Procesando empleados...</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 ease-out"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {Math.round((progress.current / progress.total) * 100)}% completado
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={onClose} disabled={isProcessing} className="px-4 py-2 border rounded-lg disabled:opacity-50">
                  Cancelar
                </button>
                <button type="submit" disabled={!csvData || isProcessing} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {isProcessing ? 'Procesando...' : 'Subir'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {results.success > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium mb-2">✓ {results.success} empleados procesados exitosamente</p>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>• {results.success - results.updated} nuevos empleados creados</p>
                    <p>• {results.updated} empleados existentes actualizados</p>
                  </div>
                </div>
              )}

              {results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-2">✕ {results.errors.length} errores encontrados:</p>
                  <div className="max-h-64 overflow-y-auto">
                    <ul className="text-sm text-red-700 space-y-1">
                      {results.errors.map((error, i) => (
                        <li key={i} className="py-1.5 border-b border-red-100 last:border-0 flex items-start">
                          <span className="text-red-500 mr-2 flex-shrink-0">•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {results.success === 0 && results.errors.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium">No se procesaron empleados</p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function EmployeeHistoryModal({ idNumber, onClose }: { idNumber: string; onClose: () => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('employee_history')
        .select('*, workstations(asset_tag), sites(name, city)')
        .eq('id_number', idNumber)
        .order('assigned_at', { ascending: false });
      if (data) setHistory(data);
      setLoading(false);
    })();
  }, [idNumber]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="border-b px-6 py-4 flex justify-between">
          <h2 className="text-xl font-bold">Employee History - ID: {idNumber}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No history found</h3>
              <p className="text-gray-600 mt-1">No assignment history for this employee yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <div key={record.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{record.employee_name}</h3>
                      <p className="text-sm text-gray-600">{record.city || '-'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      record.unassigned_at ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {record.unassigned_at ? 'Past' : 'Current'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Workstation:</span>
                      <p className="font-medium">{record.workstations?.asset_tag || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Site:</span>
                      <p className="font-medium">{record.sites?.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Assigned:</span>
                      <p className="font-medium">{new Date(record.assigned_at).toLocaleDateString()}</p>
                    </div>
                    {record.unassigned_at && (
                      <div>
                        <span className="text-gray-600">Unassigned:</span>
                        <p className="font-medium">{new Date(record.unassigned_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
