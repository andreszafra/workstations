import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import type { SecurityGroup, UserSecurityGroup, AuthUser } from '../lib/database.types';

interface SecurityGroupWithUsers extends SecurityGroup {
  user_count?: number;
  parent_group?: SecurityGroup | null;
}

export default function SecurityGroupsManagement() {
  const [groups, setGroups] = useState<SecurityGroupWithUsers[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SecurityGroupWithUsers | null>(null);
  const [groupUsers, setGroupUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupUsers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadGroups(), loadAllUsers()]);
    setLoading(false);
  };

  const loadGroups = async () => {
    const { data, error } = await supabase
      .from('security_groups')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading security groups:', error);
      alert(`Error loading security groups: ${error.message}`);
      return;
    }

    console.log('Loaded security groups:', data);

    if (data) {
      const groupsWithCounts = await Promise.all(
        data.map(async (group) => {
          const { count } = await supabase
            .from('user_security_groups')
            .select('*', { count: 'exact', head: true })
            .eq('security_group_id', group.id);

          let parent_group = null;
          if (group.parent_group_id) {
            const { data: parentData } = await supabase
              .from('security_groups')
              .select('id, name')
              .eq('id', group.parent_group_id)
              .single();
            parent_group = parentData;
          }

          return { ...group, user_count: count || 0, parent_group };
        })
      );
      console.log('Groups with counts:', groupsWithCounts);
      setGroups(groupsWithCounts);
    }
  };

  const loadAllUsers = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No session found');
        return;
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to load users:', errorText);
        return;
      }

      const { users: usersData } = await response.json();
      setAllUsers((usersData || []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        created_at: u.created_at
      })));
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const loadGroupUsers = async (groupId: string) => {
    const { data } = await supabase
      .from('user_security_groups')
      .select('user_id, is_primary')
      .eq('security_group_id', groupId);

    if (data) {
      const usersWithDetails = await Promise.all(
        data.map(async (ug) => {
          const user = allUsers.find(u => u.id === ug.user_id);
          return {
            ...ug,
            email: user?.email || 'Unknown',
          };
        })
      );
      setGroupUsers(usersWithDetails);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const parentId = formData.get('parent_group_id') as string;

    const { error } = await supabase.from('security_groups').insert({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      parent_group_id: parentId || null,
    });

    if (error) {
      console.error('Error creating security group:', error);
      alert(`Error creating security group: ${error.message}`);
      return;
    }

    await loadGroups();
    setShowCreateGroup(false);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const parentId = formData.get('parent_group_id') as string;

    const { error } = await supabase
      .from('security_groups')
      .update({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        parent_group_id: parentId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedGroup.id);

    if (error) {
      console.error('Error updating security group:', error);
      alert(`Error updating security group: ${error.message}`);
      return;
    }

    await loadGroups();
    setShowEditGroup(false);
  };

  const handleDeleteGroup = async (group: SecurityGroupWithUsers) => {
    if ((group.user_count || 0) > 0) {
      alert('Cannot delete group with assigned users. Remove users first.');
      return;
    }

    if (!confirm(`Delete security group "${group.name}"?`)) return;

    await supabase.from('security_groups').delete().eq('id', group.id);
    await loadGroups();
    if (selectedGroup?.id === group.id) {
      setSelectedGroup(null);
    }
  };

  const handleAddUserToGroup = async (userId: string, isPrimary: boolean) => {
    if (!selectedGroup) return;

    const { error } = await supabase.from('user_security_groups').insert({
      user_id: userId,
      security_group_id: selectedGroup.id,
      is_primary: isPrimary,
    });

    if (error) {
      console.error('Error adding user to group:', error);
      alert(`Error adding user to group: ${error.message}`);
      return;
    }

    await loadGroupUsers(selectedGroup.id);
    await loadGroups();
  };

  const handleRemoveUserFromGroup = async (userId: string) => {
    if (!selectedGroup) return;

    await supabase
      .from('user_security_groups')
      .delete()
      .eq('user_id', userId)
      .eq('security_group_id', selectedGroup.id);

    await loadGroupUsers(selectedGroup.id);
    await loadGroups();
  };

  const handleTogglePrimary = async (userId: string, currentPrimary: boolean) => {
    if (!selectedGroup) return;

    await supabase
      .from('user_security_groups')
      .update({ is_primary: !currentPrimary })
      .eq('user_id', userId)
      .eq('security_group_id', selectedGroup.id);

    await loadGroupUsers(selectedGroup.id);
  };

  const availableUsersForGroup = allUsers.filter(
    (user) => !groupUsers.some((gu) => gu.user_id === user.id)
  );

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Security Groups</h2>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
          {groups.map((group) => (
            <div
              key={group.id}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                selectedGroup?.id === group.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => setSelectedGroup(group)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{group.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                  {group.parent_group && (
                    <p className="text-xs text-gray-500 mt-1">
                      Parent: {(group.parent_group as any).name}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                    <Users className="w-3 h-3" />
                    <span>{group.user_count || 0} users</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-gray-50">
        {selectedGroup ? (
          <div className="h-full flex flex-col">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedGroup.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowManageUsers(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Users className="w-4 h-4" />
                    Manage Users
                  </button>
                  <button
                    onClick={() => setShowEditGroup(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Group
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Assigned Users ({groupUsers.length})</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {groupUsers.map((gu) => (
                    <div key={gu.user_id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{gu.email}</p>
                        {gu.is_primary && (
                          <span className="inline-block mt-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Primary Group
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTogglePrimary(gu.user_id, gu.is_primary)}
                          className="text-sm px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          {gu.is_primary ? 'Remove Primary' : 'Set as Primary'}
                        </button>
                        <button
                          onClick={() => handleRemoveUserFromGroup(gu.user_id)}
                          className="text-sm px-3 py-1 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {groupUsers.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No users assigned to this group
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a security group to view details
          </div>
        )}
      </div>

      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create Security Group</h2>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Group Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., IT Department, Sales Team"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the group's purpose"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Parent Group (Optional)</label>
                <select
                  name="parent_group_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditGroup && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Security Group</h2>
              <button
                onClick={() => setShowEditGroup(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateGroup} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Group Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={selectedGroup.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={selectedGroup.description}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Parent Group (Optional)</label>
                <select
                  name="parent_group_id"
                  defaultValue={selectedGroup.parent_group_id || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {groups
                    .filter((g) => g.id !== selectedGroup.id)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditGroup(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageUsers && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Users - {selectedGroup.name}</h2>
              <button
                onClick={() => setShowManageUsers(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Add Users to Group</h3>
              <div className="space-y-2">
                {availableUsersForGroup.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <span className="text-gray-900">{user.email}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddUserToGroup(user.id, false)}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => handleAddUserToGroup(user.id, true)}
                        className="text-sm px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Add as Primary
                      </button>
                    </div>
                  </div>
                ))}
                {availableUsersForGroup.length === 0 && (
                  <p className="text-gray-500 text-center py-4">All users are already in this group</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
