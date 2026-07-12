import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authService, type Action } from '../lib/authorization';

interface ModulePermissions {
  canAccess: boolean;
  canList: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
  canBulkUpdate: boolean;
  accessibleGroupIds: string[];
}

export function useAuthorization(moduleKey: string) {
  const [permissions, setPermissions] = useState<ModulePermissions>({
    canAccess: false,
    canList: false,
    canView: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    canImport: false,
    canBulkUpdate: false,
    accessibleGroupIds: [],
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, [moduleKey]);

  const loadPermissions = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    try {
      const context = await authService.getUserAuthContext(user.id);
      const canAccess = authService.isModuleAccessEnabled(context.roles, moduleKey);

      if (!canAccess) {
        setPermissions({
          canAccess: false,
          canList: false,
          canView: false,
          canEdit: false,
          canDelete: false,
          canExport: false,
          canImport: false,
          canBulkUpdate: false,
          accessibleGroupIds: [],
        });
        setLoading(false);
        return;
      }

      const listPerm = authService.resolvePermission(context.roles, moduleKey, 'list');
      const viewPerm = authService.resolvePermission(context.roles, moduleKey, 'view');
      const editPerm = authService.resolvePermission(context.roles, moduleKey, 'edit');
      const deletePerm = authService.resolvePermission(context.roles, moduleKey, 'delete');
      const exportPerm = authService.resolvePermission(context.roles, moduleKey, 'export');
      const importPerm = authService.resolvePermission(context.roles, moduleKey, 'import');
      const bulkUpdatePerm = authService.resolvePermission(context.roles, moduleKey, 'bulk_update');

      setPermissions({
        canAccess: true,
        canList: listPerm !== 'None' && listPerm !== 'NotSet',
        canView: viewPerm !== 'None' && viewPerm !== 'NotSet',
        canEdit: editPerm !== 'None' && editPerm !== 'NotSet',
        canDelete: deletePerm !== 'None' && deletePerm !== 'NotSet',
        canExport: exportPerm !== 'None' && exportPerm !== 'NotSet',
        canImport: importPerm !== 'None' && importPerm !== 'NotSet',
        canBulkUpdate: bulkUpdatePerm !== 'None' && bulkUpdatePerm !== 'NotSet',
        accessibleGroupIds: context.securityGroupIds,
      });
    } catch (error) {
      console.error('Error loading permissions:', error);
    }

    setLoading(false);
  };

  const canPerformAction = async (action: Action, recordOwnerGroupId?: string): Promise<boolean> => {
    if (!userId) return false;
    return await authService.can(userId, moduleKey, action, recordOwnerGroupId);
  };

  const getUserPrimaryGroup = async (): Promise<string | null> => {
    if (!userId) return null;

    const { data } = await supabase
      .from('user_security_groups')
      .select('security_group_id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();

    return data?.security_group_id || null;
  };

  const filterByPermission = (records: any[], action: Action): any[] => {
    if (!userId) return [];

    const actionMap: { [key in Action]: keyof ModulePermissions } = {
      list: 'canList',
      view: 'canView',
      edit: 'canEdit',
      delete: 'canDelete',
      export: 'canExport',
      import: 'canImport',
      bulk_update: 'canBulkUpdate',
    };

    const permissionKey = actionMap[action];
    if (!permissions[permissionKey]) return [];

    if (permissions.accessibleGroupIds.length === 0) {
      return records;
    }

    return records.filter(record =>
      permissions.accessibleGroupIds.includes(record.owner_security_group_id)
    );
  };

  return {
    permissions,
    loading,
    userId,
    canPerformAction,
    getUserPrimaryGroup,
    filterByPermission,
    reload: loadPermissions,
  };
}
