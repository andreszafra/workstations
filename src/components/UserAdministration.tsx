import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Users, Plus, UserPlus, X, Trash2, KeyRound, Edit } from 'lucide-react';
import { useEmployees } from '../hooks/useData';
import type { Role, SecurityGroup, Employee } from '../lib/database.types';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

interface UserWithDetails extends AuthUser {
  roles: Role[];
  security_groups: Array<SecurityGroup & { is_primary: boolean }>;
  employee: { id: string; name: string; id_number: string } | null;
}

export default function UserAdministration() {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allGroups, setAllGroups] = useState<SecurityGroup[]>([]);
  const [showManageRoles, setShowManageRoles] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showConvertEmployees, setShowConvertEmployees] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadRoles(), loadGroups()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No session found');
        alert('Session expired. Please log in again.');
        return;
      }

      console.log('Calling list-users with token:', session.access_token.substring(0, 20) + '...');

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Unknown error';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        }
        console.error('Failed to load users. Status:', response.status, 'Message:', errorMessage, 'Full response:', errorText);
        alert(`Failed to load users: ${errorMessage}`);
        return;
      }

      const { users: usersData } = await response.json();
      setUsers(usersData || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      alert(`Error loading users: ${error.message}`);
    }
  };

  const loadRoles = async () => {
    const { data } = await supabase.from('roles').select('*').order('name');
    setAllRoles(data || []);
  };

  const loadGroups = async () => {
    const { data } = await supabase.from('security_groups').select('*').order('name');
    setAllGroups(data || []);
  };

  const refreshSelectedUser = async (userId: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (response.ok) {
        const { users: usersData } = await response.json();
        setUsers(usersData);
        const updatedUser = usersData.find((u: UserWithDetails) => u.id === userId);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Error refreshing selected user:', error);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role_id: roleId,
    });

    if (error) {
      console.error('Error assigning role:', error);
      alert(`Failed to assign role: ${error.message}`);
      return;
    }

    await refreshSelectedUser(userId);
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (error) {
      console.error('Error removing role:', error);
      alert(`Failed to remove role: ${error.message}`);
      return;
    }

    await refreshSelectedUser(userId);
  };

  const handleAssignGroup = async (userId: string, groupId: string, isPrimary: boolean) => {
    const { error } = await supabase.from('user_security_groups').insert({
      user_id: userId,
      security_group_id: groupId,
      is_primary: isPrimary,
    });

    if (error) {
      console.error('Error assigning security group:', error);
      alert(`Failed to assign security group: ${error.message}`);
      return;
    }

    await refreshSelectedUser(userId);
  };

  const handleRemoveGroup = async (userId: string, groupId: string) => {
    const { error } = await supabase
      .from('user_security_groups')
      .delete()
      .eq('user_id', userId)
      .eq('security_group_id', groupId);

    if (error) {
      console.error('Error removing security group:', error);
      alert(`Failed to remove security group: ${error.message}`);
      return;
    }

    await refreshSelectedUser(userId);
  };

  const handleTogglePrimaryGroup = async (userId: string, groupId: string, currentPrimary: boolean) => {
    if (!currentPrimary) {
      const { error: clearError } = await supabase
        .from('user_security_groups')
        .update({ is_primary: false })
        .eq('user_id', userId);

      if (clearError) {
        console.error('Error clearing primary groups:', clearError);
        alert(`Failed to update primary group: ${clearError.message}`);
        return;
      }
    }

    const { error } = await supabase
      .from('user_security_groups')
      .update({ is_primary: !currentPrimary })
      .eq('user_id', userId)
      .eq('security_group_id', groupId);

    if (error) {
      console.error('Error toggling primary group:', error);
      alert(`Failed to toggle primary group: ${error.message}`);
      return;
    }

    await refreshSelectedUser(userId);
  };

  const availableRolesForUser = (user: UserWithDetails) => {
    return allRoles.filter((role) => !user.roles.some((ur) => ur.id === role.id));
  };

  const availableGroupsForUser = (user: UserWithDetails) => {
    return allGroups.filter((group) => !user.security_groups.some((ug) => ug.id === group.id));
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete the user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('No session found');
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to delete user: ${error.error}`);
        return;
      }

      setSelectedUser(null);
      await loadUsers();
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('An error occurred while deleting the user');
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-600 mt-1">{users.length} total users</p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
            <button
              onClick={() => setShowConvertEmployees(true)}
              className="flex items-center gap-2 justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <UserPlus className="w-4 h-4" />
              Convert Employees
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 280px)' }}>
          {users.map((user) => (
            <div
              key={user.id}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                selectedUser?.id === user.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{user.email}</h3>
                {user.employee && (
                  <p className="text-xs text-green-600 mt-1">
                    {user.employee.name}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>{user.roles.length} roles</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{user.security_groups.length} groups</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-gray-50">
        {selectedUser ? (
          <div className="h-full flex flex-col">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedUser.email}</h2>
                  <p className="text-sm text-gray-600 mt-1">User ID: {selectedUser.id}</p>
                  {selectedUser.employee && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      <Users className="w-4 h-4" />
                      Linked to: {selectedUser.employee.name}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEditUser(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    title="Edit User"
                  >
                    <Edit className="w-4 h-4" />
                    Edit User
                  </button>
                  <button
                    onClick={() => setShowResetPassword(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    title="Reset Password"
                  >
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </button>
                  <button
                    onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Assigned Roles ({selectedUser.roles.length})
                  </h3>
                  <button
                    onClick={() => setShowManageRoles(true)}
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Manage Roles
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {selectedUser.roles.map((role) => (
                    <div key={role.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{role.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                        {role.is_system && (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                            System Role
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveRole(selectedUser.id, role.id)}
                        className="text-sm px-3 py-1 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {selectedUser.roles.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">No roles assigned</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Security Groups ({selectedUser.security_groups.length})
                  </h3>
                  <button
                    onClick={() => setShowManageGroups(true)}
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Manage Groups
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {selectedUser.security_groups.map((group) => (
                    <div key={group.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{group.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                        {group.is_primary && (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Primary Group
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleTogglePrimaryGroup(selectedUser.id, group.id, group.is_primary)
                          }
                          className="text-sm px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          {group.is_primary ? 'Remove Primary' : 'Set as Primary'}
                        </button>
                        <button
                          onClick={() => handleRemoveGroup(selectedUser.id, group.id)}
                          className="text-sm px-3 py-1 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedUser.security_groups.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">No groups assigned</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a user to manage roles and security groups
          </div>
        )}
      </div>

      {showManageRoles && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Roles - {selectedUser.email}</h2>
              <button
                onClick={() => setShowManageRoles(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Assign Roles</h3>
              <div className="space-y-2">
                {availableRolesForUser(selectedUser).map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{role.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await handleAssignRole(selectedUser.id, role.id);
                        setShowManageRoles(false);
                      }}
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </div>
                ))}
                {availableRolesForUser(selectedUser).length === 0 && (
                  <p className="text-gray-500 text-center py-4">All roles are already assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showManageGroups && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Security Groups - {selectedUser.email}</h2>
              <button
                onClick={() => setShowManageGroups(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Assign Security Groups</h3>
              <div className="space-y-2">
                {availableGroupsForUser(selectedUser).map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await handleAssignGroup(selectedUser.id, group.id, false);
                          setShowManageGroups(false);
                        }}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Assign
                      </button>
                      <button
                        onClick={async () => {
                          await handleAssignGroup(selectedUser.id, group.id, true);
                          setShowManageGroups(false);
                        }}
                        className="text-sm px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Assign as Primary
                      </button>
                    </div>
                  </div>
                ))}
                {availableGroupsForUser(selectedUser).length === 0 && (
                  <p className="text-gray-500 text-center py-4">All groups are already assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateUser && (
        <CreateUserModal
          allRoles={allRoles}
          allGroups={allGroups}
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => {
            setShowCreateUser(false);
            loadUsers();
          }}
        />
      )}

      {showConvertEmployees && (
        <ConvertEmployeesModal
          onClose={() => setShowConvertEmployees(false)}
          onSuccess={() => {
            setShowConvertEmployees(false);
            loadUsers();
          }}
        />
      )}

      {showResetPassword && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => setShowResetPassword(false)}
          onSuccess={() => {
            setShowResetPassword(false);
            alert('Password updated successfully');
          }}
        />
      )}

      {showEditUser && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setShowEditUser(false)}
          onSuccess={async () => {
            setShowEditUser(false);
            await refreshSelectedUser(selectedUser.id);
            alert('User updated successfully');
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ allRoles, allGroups, onClose, onSuccess }: {
  allRoles: Role[];
  allGroups: SecurityGroup[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('No session found');
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          roleIds: selectedRoles,
          securityGroupIds: selectedGroups,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create user');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create New User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-3">
              {allRoles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, role.id]);
                      } else {
                        setSelectedRoles(selectedRoles.filter((id) => id !== role.id));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Security Groups</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-3">
              {allGroups.map((group) => (
                <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroups([...selectedGroups, group.id]);
                      } else {
                        setSelectedGroups(selectedGroups.filter((id) => id !== group.id));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{group.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onSuccess }: {
  user: UserWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('No session found');
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId: user.id,
          newPassword,
          requirePasswordChange,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update password';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Password update error:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Reset Password</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">User:</span> {user.email}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              minLength={6}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requirePasswordChange}
                onChange={(e) => setRequirePasswordChange(e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-amber-900">Requerir cambio de contraseña</span>
                <p className="text-xs text-amber-700 mt-1">
                  El usuario deberá cambiar su contraseña la próxima vez que inicie sesión.
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSuccess }: {
  user: UserWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { employees } = useEmployees();
  const [email, setEmail] = useState(user.email);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [linkedEmployeeId, setLinkedEmployeeId] = useState<string | null>(user.employee?.id || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUserMetadata = async () => {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const userData = data.users?.find((u: any) => u.id === user.id);
          if (userData) {
            setFirstName(userData.user_metadata?.first_name || '');
            setLastName(userData.user_metadata?.last_name || '');
          }
        }
      } catch (err) {
        console.error('Failed to load user metadata:', err);
      }
    };
    loadUserMetadata();
  }, [user.id]);

  const availableEmployees = employees.filter(
    (emp) => !emp.user_id || emp.id === linkedEmployeeId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('No session found');
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId: user.id,
          email,
          firstName,
          lastName,
          employeeId: linkedEmployeeId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="p-6 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">User ID:</span> {user.id}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Employee (Optional)
              </label>
              <select
                value={linkedEmployeeId || ''}
                onChange={(e) => setLinkedEmployeeId(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No employee linkage --</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.email ? `(${emp.email})` : ''} {emp.id === linkedEmployeeId ? '(Currently linked)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Linking an employee allows this user to be associated with employee records
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Note:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Email changes may require the user to verify their new email</li>
                <li>Use the "Reset Password" button to change the user's password</li>
                <li>Roles and Security Groups are managed separately below</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 justify-end px-6 py-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConvertEmployeesModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { employees } = useEmployees();
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [useIdAsPassword, setUseIdAsPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const availableEmployees = employees.filter((emp) => !emp.user_id);
  const filteredEmployees = availableEmployees.filter((emp) =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee');
      return;
    }

    if (!useIdAsPassword && !password) {
      setError('Please enter a default password or enable "Use ID as password"');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-create-users-from-employees`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('No session found');
        setLoading(false);
        return;
      }

      const requestBody = {
        employeeIds: selectedEmployees,
        defaultPassword: useIdAsPassword ? undefined : password,
        useIdAsPassword: useIdAsPassword,
        requirePasswordChange: true,
      };

      console.log('Bulk creating users for', selectedEmployees.length, 'employees');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: `;
        try {
          const errorData = await response.json();
          console.error('Full error response:', errorData);

          if (errorData.details) {
            console.error('Error details:', errorData.details);
            errorMessage += JSON.stringify(errorData.details, null, 2);
          } else {
            errorMessage += errorData.error || errorData.message || 'Unknown error';
          }
        } catch {
          const textError = await response.text();
          errorMessage += textError || 'Unknown error';
        }
        console.error('Failed to bulk create users:', errorMessage);
        setError(`Failed to create users: ${errorMessage}`);
        setLoading(false);
        return;
      }

      const results = await response.json();

      let message = '';
      if (results.success.length > 0) {
        message += `Successfully created ${results.success.length} user(s). `;
      }
      if (results.skipped.length > 0) {
        message += `Skipped ${results.skipped.length} employee(s) who already have accounts. `;
      }
      if (results.failed.length > 0) {
        message += `Failed to create ${results.failed.length} user(s). `;
        const failedNames = results.failed.map((f: any) => f.name).join(', ');
        message += `(${failedNames})`;
      }

      if (results.failed.length > 0) {
        setError(message);
        setLoading(false);
      } else {
        alert(message);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Convert Employees to Users</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="mx-6 mt-4 bg-red-50 text-red-800 p-4 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Password for All Users {!useIdAsPassword && '*'}
              </label>
              <input
                type="password"
                required={!useIdAsPassword}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                minLength={6}
                placeholder="Users should change this on first login"
                disabled={useIdAsPassword}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useIdAsPassword}
                  onChange={(e) => setUseIdAsPassword(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-blue-900">Usar ID como contraseña</span>
                  <p className="text-xs text-blue-700 mt-1">
                    Se usará el número de identificación del empleado como contraseña temporal.
                    Los usuarios deberán cambiar su contraseña al iniciar sesión por primera vez.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Employees
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Search by name or email..."
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employees ({selectedEmployees.length} selected)
            </label>
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {availableEmployees.length === 0
                  ? 'All employees already have user accounts'
                  : 'No employees found matching your search'}
              </div>
            ) : (
              <div className="space-y-2 border rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees(filteredEmployees.map((emp) => emp.id));
                      } else {
                        setSelectedEmployees([]);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </label>
                {filteredEmployees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees([...selectedEmployees, employee.id]);
                        } else {
                          setSelectedEmployees(
                            selectedEmployees.filter((id) => id !== employee.id)
                          );
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                      <p className="text-xs text-gray-500">{employee.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end px-6 py-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedEmployees.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating Users...' : `Create ${selectedEmployees.length} User(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
