import { supabase } from './supabase';

export type Permission = 'All' | 'OwnerGroupOnly' | 'None' | 'NotSet';
export type AccessLevel = 'Enabled' | 'Disabled';
export type Action = 'delete' | 'edit' | 'export' | 'import' | 'list' | 'bulk_update' | 'view';

export interface RoleModulePermission {
  id: string;
  role_id: string;
  module_key: string;
  access: AccessLevel;
  delete_perm: Permission;
  edit_perm: Permission;
  export_perm: Permission;
  import_perm: Permission;
  list_perm: Permission;
  bulk_update_perm: Permission;
  view_perm: Permission;
}

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  parent_group_id: string | null;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  role: {
    id: string;
    name: string;
    is_system: boolean;
  };
}

export interface UserSecurityGroup {
  user_id: string;
  security_group_id: string;
  is_primary: boolean;
  security_group: SecurityGroup;
}

export interface SystemSecurityConfig {
  key: string;
  value: string;
  description: string;
}

export interface UserAuthContext {
  userId: string;
  roles: RoleModulePermission[];
  securityGroupIds: string[];
  isAdmin: boolean;
}

class AuthorizationService {
  private configCache: Map<string, string> = new Map();
  private configCacheTime: number = 0;
  private CACHE_TTL = 60000; // 1 minute

  async getSystemConfig(key: string): Promise<string | null> {
    const now = Date.now();

    if (now - this.configCacheTime > this.CACHE_TTL) {
      this.configCache.clear();
      this.configCacheTime = now;
    }

    if (this.configCache.has(key)) {
      return this.configCache.get(key) || null;
    }

    const { data } = await supabase
      .from('system_security_config')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (data) {
      this.configCache.set(key, data.value);
      return data.value;
    }

    return null;
  }

  async isInheritanceEnabled(): Promise<boolean> {
    const value = await this.getSystemConfig('security_group_inheritance_enabled');
    return value === 'true';
  }

  async canNonAdminAssignOutsideGroups(): Promise<boolean> {
    const value = await this.getSystemConfig('non_admin_can_assign_users_outside_own_groups');
    return value === 'true';
  }

  async getUserAuthContext(userId: string): Promise<UserAuthContext> {
    const [userRolesResult, userGroupsResult] = await Promise.all([
      supabase
        .from('user_roles')
        .select(`
          user_id,
          role_id,
          role:roles!inner(id, name, is_system)
        `)
        .eq('user_id', userId),
      supabase
        .from('user_security_groups')
        .select(`
          user_id,
          security_group_id,
          is_primary,
          security_group:security_groups!inner(id, name, description, parent_group_id)
        `)
        .eq('user_id', userId)
    ]);

    const userRoles = userRolesResult.data as unknown as UserRole[] || [];
    const userGroups = userGroupsResult.data as unknown as UserSecurityGroup[] || [];

    const isAdmin = userRoles.some(ur =>
      (ur.role as any)?.name === 'System Admin' || (ur.role as any)?.is_system === true
    );

    const roleIds = userRoles.map(ur => ur.role_id);

    const { data: permissions } = await supabase
      .from('role_module_permissions')
      .select('*')
      .in('role_id', roleIds.length > 0 ? roleIds : ['none']);

    let securityGroupIds = userGroups.map(ug => ug.security_group_id);

    const inheritanceEnabled = await this.isInheritanceEnabled();
    if (inheritanceEnabled) {
      securityGroupIds = await this.expandGroupsWithDescendants(securityGroupIds);
    }

    return {
      userId,
      roles: permissions || [],
      securityGroupIds,
      isAdmin
    };
  }

  async expandGroupsWithDescendants(groupIds: string[]): Promise<string[]> {
    if (groupIds.length === 0) return [];

    const { data: allGroups } = await supabase
      .from('security_groups')
      .select('id, parent_group_id');

    if (!allGroups) return groupIds;

    const result = new Set<string>(groupIds);

    const findChildren = (parentId: string) => {
      const children = allGroups.filter(g => g.parent_group_id === parentId);
      children.forEach(child => {
        if (!result.has(child.id)) {
          result.add(child.id);
          findChildren(child.id);
        }
      });
    };

    groupIds.forEach(id => findChildren(id));

    return Array.from(result);
  }

  resolvePermission(permissions: RoleModulePermission[], moduleKey: string, action: Action): Permission {
    const modulePermissions = permissions.filter(p => p.module_key === moduleKey);

    if (modulePermissions.length === 0) {
      return 'None';
    }

    const accessDisabled = modulePermissions.some(p => p.access === 'Disabled');
    if (accessDisabled) {
      return 'None';
    }

    const actionKey = `${action}_perm` as keyof RoleModulePermission;
    const actionPermissions = modulePermissions.map(p => p[actionKey] as Permission);

    if (actionPermissions.some(p => p === 'All')) {
      return 'All';
    }

    if (actionPermissions.some(p => p === 'OwnerGroupOnly')) {
      return 'OwnerGroupOnly';
    }

    if (actionPermissions.some(p => p === 'None')) {
      return 'None';
    }

    return 'None';
  }

  isModuleAccessEnabled(permissions: RoleModulePermission[], moduleKey: string): boolean {
    const modulePermissions = permissions.filter(p => p.module_key === moduleKey);

    if (modulePermissions.length === 0) {
      return false;
    }

    const hasDisabled = modulePermissions.some(p => p.access === 'Disabled');
    if (hasDisabled) {
      return false;
    }

    const hasEnabled = modulePermissions.some(p => p.access === 'Enabled');
    return hasEnabled;
  }

  async can(
    userId: string,
    moduleKey: string,
    action: Action,
    recordOwnerGroupId?: string
  ): Promise<boolean> {
    const context = await this.getUserAuthContext(userId);

    if (!this.isModuleAccessEnabled(context.roles, moduleKey)) {
      return false;
    }

    const permission = this.resolvePermission(context.roles, moduleKey, action);

    if (permission === 'All') {
      return true;
    }

    if (permission === 'OwnerGroupOnly') {
      if (!recordOwnerGroupId) {
        return true;
      }
      return context.securityGroupIds.includes(recordOwnerGroupId);
    }

    return false;
  }

  async canAccessModule(userId: string, moduleKey: string): Promise<boolean> {
    const context = await this.getUserAuthContext(userId);
    return this.isModuleAccessEnabled(context.roles, moduleKey);
  }

  async getAccessibleGroupIds(userId: string): Promise<string[]> {
    const context = await this.getUserAuthContext(userId);
    return context.securityGroupIds;
  }

  async canAssignToGroup(userId: string, targetGroupId: string): Promise<boolean> {
    const context = await this.getUserAuthContext(userId);

    if (context.isAdmin) {
      return true;
    }

    const canAssignOutside = await this.canNonAdminAssignOutsideGroups();
    if (canAssignOutside) {
      return await this.can(userId, 'security_groups', 'edit');
    }

    return context.securityGroupIds.includes(targetGroupId);
  }

  async filterRecordsByPermission(
    userId: string,
    moduleKey: string,
    action: Action,
    records: any[]
  ): Promise<any[]> {
    const context = await this.getUserAuthContext(userId);

    if (!this.isModuleAccessEnabled(context.roles, moduleKey)) {
      return [];
    }

    const permission = this.resolvePermission(context.roles, moduleKey, action);

    if (permission === 'All') {
      return records;
    }

    if (permission === 'OwnerGroupOnly') {
      return records.filter(record =>
        context.securityGroupIds.includes(record.owner_security_group_id)
      );
    }

    return [];
  }

  getOwnerGroupFilter(permission: Permission, userGroupIds: string[]): any {
    if (permission === 'All') {
      return undefined;
    }

    if (permission === 'OwnerGroupOnly') {
      return { in: userGroupIds.length > 0 ? userGroupIds : ['none'] };
    }

    return { in: ['none'] };
  }
}

export const authService = new AuthorizationService();
