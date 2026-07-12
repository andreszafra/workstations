import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import type { Role, RoleModulePermission } from '../lib/database.types';

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sites', label: 'Sites' },
  { key: 'employees', label: 'Employees' },
  { key: 'workstations', label: 'Workstations' },
  { key: 'workstation_types', label: 'Workstation Types' },
  { key: 'map_elements', label: 'Map Elements' },
  { key: 'settings', label: 'Settings' },
  { key: 'security_groups', label: 'Security Groups' },
  { key: 'roles', label: 'Roles' },
  { key: 'users', label: 'Users' },
];

const ACTIONS = [
  { key: 'access', label: 'Access', options: ['Enabled', 'Disabled'] },
  { key: 'list_perm', label: 'List', options: ['All', 'OwnerGroupOnly', 'None', 'NotSet'] },
  { key: 'view_perm', label: 'View', options: ['All', 'OwnerGroupOnly', 'None', 'NotSet'] },
  { key: 'edit_perm', label: 'Edit', options: ['All', 'OwnerGroupOnly', 'None', 'NotSet'] },
  { key: 'delete_perm', label: 'Delete', options: ['All', 'OwnerGroupOnly', 'None', 'NotSet'] },
  { key: 'export_perm', label: 'Export', options: ['All', 'OwnerGroupOnly', 'None', 'NotSet'] },
  { key: 'import_perm', label: 'Import', options: ['All', 'OwnerGroupOnly', 'None', 'NotSet'] },
  { key: 'bulk_update_perm', label: 'Bulk Update', options: ['All', 'OwnerGroupOnly', 'None', 'NotSet'] },
];

export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<RoleModulePermission[]>([]);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadPermissions(selectedRole.id);
    }
  }, [selectedRole]);

  const loadRoles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    setRoles(data || []);
    setLoading(false);
  };

  const loadPermissions = async (roleId: string) => {
    const { data } = await supabase
      .from('role_module_permissions')
      .select('*')
      .eq('role_id', roleId);
    setPermissions(data || []);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const { data: newRole } = await supabase
      .from('roles')
      .insert({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        is_system: false,
      })
      .select()
      .single();

    if (newRole) {
      for (const module of MODULES) {
        await supabase.from('role_module_permissions').insert({
          role_id: newRole.id,
          module_key: module.key,
          access: 'Disabled',
          delete_perm: 'NotSet',
          edit_perm: 'NotSet',
          export_perm: 'NotSet',
          import_perm: 'NotSet',
          list_perm: 'NotSet',
          bulk_update_perm: 'NotSet',
          view_perm: 'NotSet',
        });
      }

      await loadRoles();
      setSelectedRole(newRole);
      setShowCreateRole(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      alert('Cannot delete system roles');
      return;
    }

    if (!confirm(`Delete role "${role.name}"?`)) return;

    await supabase.from('roles').delete().eq('id', role.id);
    await loadRoles();
    if (selectedRole?.id === role.id) {
      setSelectedRole(null);
    }
  };

  const handleUpdatePermission = async (
    moduleKey: string,
    action: string,
    value: string
  ) => {
    if (!selectedRole) return;

    const existing = permissions.find(p => p.module_key === moduleKey);

    if (existing) {
      await supabase
        .from('role_module_permissions')
        .update({ [action]: value })
        .eq('id', existing.id);
    } else {
      await supabase.from('role_module_permissions').insert({
        role_id: selectedRole.id,
        module_key: moduleKey,
        [action]: value,
      });
    }

    await loadPermissions(selectedRole.id);
  };

  const getPermissionValue = (moduleKey: string, action: string): string => {
    const perm = permissions.find(p => p.module_key === moduleKey);
    return perm?.[action as keyof RoleModulePermission] as string || (action === 'access' ? 'Disabled' : 'NotSet');
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Roles</h2>
            <button
              onClick={() => setShowCreateRole(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
          {roles.map((role) => (
            <div
              key={role.id}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                selectedRole?.id === role.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedRole(role)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                  {role.is_system && (
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                      System Role
                    </span>
                  )}
                </div>
                {!role.is_system && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRole(role);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-gray-50">
        {selectedRole ? (
          <div className="h-full flex flex-col">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedRole.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedRole.description}</p>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                          Module
                        </th>
                        {ACTIONS.map((action) => (
                          <th
                            key={action.key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                          >
                            {action.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {MODULES.map((module) => (
                        <tr key={module.key} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                            {module.label}
                          </td>
                          {ACTIONS.map((action) => (
                            <td key={action.key} className="px-4 py-3">
                              <select
                                value={getPermissionValue(module.key, action.key)}
                                onChange={(e) =>
                                  handleUpdatePermission(module.key, action.key, e.target.value)
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {action.options.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Permission Rules:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Access Disabled</strong> = Module is completely hidden and inaccessible</li>
                  <li>• <strong>All</strong> = Can perform action on all records</li>
                  <li>• <strong>OwnerGroupOnly</strong> = Can perform action only on records owned by user's security group</li>
                  <li>• <strong>None</strong> = Cannot perform action</li>
                  <li>• <strong>NotSet</strong> = No permission granted (defaults to None)</li>
                  <li>• <strong>List vs View</strong>: List shows records in tables, View allows opening detail pages</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a role to view and edit permissions
          </div>
        )}
      </div>

      {showCreateRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create New Role</h2>
              <button
                onClick={() => setShowCreateRole(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Role Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Manager, Employee"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the role's purpose"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateRole(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
