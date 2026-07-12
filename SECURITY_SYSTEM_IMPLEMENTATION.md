# Security System Implementation Guide

## Overview

A comprehensive, enterprise-grade authorization system with **Roles + Security Groups** has been implemented for this ERP application. This system is designed to scale as new modules are added, providing fine-grained access control at both the module and record level.

---

## What Has Been Implemented

### 1. Database Schema ✅

**Tables Created:**
- `roles` - Role definitions
- `role_module_permissions` - Permission matrix for each role on each module
- `security_groups` - Security groups with optional hierarchy
- `user_security_groups` - User-to-group assignments
- `user_roles` - User-to-role assignments
- `system_security_config` - Global security settings

**Ownership Columns Added to All Business Tables:**
- `owner_security_group_id` (required) - Which security group owns this record
- `created_by_user_id` - Who created the record
- `updated_by_user_id` - Who last updated the record

Tables updated: `sites`, `employees`, `workstations`, `workstation_types`, `map_elements`

**Default Data Created:**
- "Default" security group (ID: `00000000-0000-0000-0000-000000000001`)
- "System Admin" role (ID: `00000000-0000-0000-0000-000000000002`) with full permissions
- System configuration defaults:
  - `security_group_inheritance_enabled` = true
  - `non_admin_can_assign_users_outside_own_groups` = false

### 2. Authorization Service ✅

**File:** `src/lib/authorization.ts`

**Core Functions:**
- `can(userId, moduleKey, action, recordOwnerGroupId?)` - Check if user can perform an action
- `canAccessModule(userId, moduleKey)` - Check if user can access a module at all
- `getAccessibleGroupIds(userId)` - Get all security groups user belongs to (with inheritance)
- `canAssignToGroup(userId, targetGroupId)` - Check if user can assign records/users to a group
- `filterRecordsByPermission(userId, moduleKey, action, records)` - Filter records by permission
- `resolvePermission(permissions, moduleKey, action)` - Aggregate permissions across multiple roles

**Permission Resolution Rules (Implemented):**
1. **Access (Enabled/Disabled):** If ANY role sets Disabled, module is disabled
2. **Action Permissions:** Precedence is All > OwnerGroupOnly > None > NotSet
3. **Multiple Roles:** Permissions are additive (highest permission wins)
4. **Owner Group Only:** User can only access records where `owner_security_group_id` matches their group(s)
5. **Inheritance:** If enabled, parent group membership grants access to child group records

### 3. Admin UI ✅

**Three New Admin Pages:**

1. **Roles Management** (`src/components/RolesManagement.tsx`)
   - Create, view, edit, delete roles
   - Permission matrix editor with all modules and actions
   - Visual permission grid (rows=modules, columns=actions)
   - Cannot delete system roles

2. **Security Groups Management** (`src/components/SecurityGroupsManagement.tsx`)
   - Create, view, edit, delete security groups
   - Set parent groups (hierarchy)
   - Assign users to groups
   - Set primary group for users
   - View user count per group

3. **User Administration** (`src/components/UserAdministration.tsx`)
   - View all users
   - Assign/remove roles to users
   - Assign/remove security groups to users
   - Set primary security group

**Navigation:**
- Added to main app navigation with icons: Shield (Roles), Lock (Security Groups), UserCog (Users)

### 4. Database Types ✅

Updated `src/lib/database.types.ts` with:
- `Role`, `RoleModulePermission`
- `SecurityGroup`, `UserSecurityGroup`, `UserRole`
- `SystemSecurityConfig`, `AuthUser`

### 5. RLS Policies ✅

Basic RLS policies created for all security tables allowing authenticated users full access. These policies need to be refined for production (see "What Needs to Be Done" below).

---

## Module Registry

The following modules are registered in the system:

| Module Key | Label | Description |
|------------|-------|-------------|
| `dashboard` | Dashboard | Main dashboard view |
| `sites` | Sites | Site/location management |
| `employees` | Employees | Employee records |
| `workstations` | Workstations | Workstation assets |
| `workstation_types` | Workstation Types | Workstation type definitions |
| `map_elements` | Map Elements | Floor plan elements |
| `settings` | Settings | System settings |
| `security_groups` | Security Groups | Security group management |
| `roles` | Roles | Role management |
| `users` | Users | User administration |

**To add a new module:** Add it to the MODULES array in `RolesManagement.tsx` and ensure the default System Admin role includes permissions for it (happens automatically when creating new roles).

---

## Permission Actions & Values

### Actions
Each module supports these actions:
- **Access:** Enabled | Disabled (controls module visibility)
- **List:** All | OwnerGroupOnly | None | NotSet (view records in lists/tables)
- **View:** All | OwnerGroupOnly | None | NotSet (view individual record details)
- **Edit:** All | OwnerGroupOnly | None | NotSet (modify records)
- **Delete:** All | OwnerGroupOnly | None | NotSet (delete records)
- **Export:** All | OwnerGroupOnly | None | NotSet (export data)
- **Import:** All | OwnerGroupOnly | None | NotSet (import data)
- **Bulk Update:** All | OwnerGroupOnly | None | NotSet (bulk operations)

### Important Semantic Difference
- **List** = User can see records in list/table views
- **View** = User can open and see full details of a specific record
- A user may have List but not View, or vice versa

### Value Precedence
When a user has multiple roles:
1. **All** (strongest)
2. **OwnerGroupOnly**
3. **None**
4. **NotSet** (weakest - treated as None)

---

## What Still Needs to Be Done

### 🔴 Critical - Authorization Enforcement

The authorization system is built but **NOT YET ENFORCED** in the application. You need to:

1. **Update All Data Queries**
   - Modify all `supabase.from('table').select()` calls to filter by ownership
   - Use `authService.getUserAuthContext()` to get user's accessible groups
   - Add `.in('owner_security_group_id', accessibleGroupIds)` to queries
   - Example:
     ```typescript
     const context = await authService.getUserAuthContext(userId);
     const permission = authService.resolvePermission(context.roles, 'sites', 'list');

     if (permission === 'All') {
       // No filter needed
       query = supabase.from('sites').select('*');
     } else if (permission === 'OwnerGroupOnly') {
       query = supabase.from('sites').select('*').in('owner_security_group_id', context.securityGroupIds);
     } else {
       // Return empty result
       return [];
     }
     ```

2. **Add Authorization Checks to All CRUD Operations**
   - Before creating: Check Edit permission + verify user can assign to target group
   - Before updating: Check Edit permission + verify ownership
   - Before deleting: Check Delete permission + verify ownership
   - Before viewing: Check View permission + verify ownership

3. **Hide UI Elements Based on Permissions**
   - Hide "Create" buttons if user lacks Edit permission
   - Hide "Delete" buttons if user lacks Delete permission
   - Hide entire modules in navigation if Access is Disabled
   - Example:
     ```typescript
     const canEdit = await authService.can(userId, 'sites', 'edit');
     {canEdit && <button onClick={handleEdit}>Edit</button>}
     ```

4. **Set Owner Group on Record Creation**
   - Get user's primary security group
   - Set `owner_security_group_id` on all new records
   - Set `created_by_user_id` to current user
   - Example:
     ```typescript
     const { data: userGroups } = await supabase
       .from('user_security_groups')
       .select('security_group_id')
       .eq('user_id', userId)
       .eq('is_primary', true)
       .single();

     await supabase.from('sites').insert({
       ...formData,
       owner_security_group_id: userGroups.security_group_id,
       created_by_user_id: userId,
     });
     ```

5. **Fix User Administration Component**
   - `supabase.auth.admin.listUsers()` doesn't work client-side
   - Need to create an Edge Function to list users
   - Or use a different approach (store user emails in a separate table)

### 🟡 Important - RLS Policy Refinement

Current RLS policies allow all authenticated users full access. Refine these to:
- Check user's roles and permissions
- Implement proper ownership checks
- Create stored functions for permission checking if needed

### 🟢 Nice to Have - Additional Features

1. **Audit Logging**
   - Log all permission checks
   - Log all role/group assignments
   - Track who modified what records

2. **Permission Presets**
   - Create common role templates (Manager, Viewer, Editor)
   - Bulk permission assignment

3. **Group Hierarchy Visualization**
   - Tree view of security group hierarchy
   - Visual representation of inheritance

4. **Permission Testing Tool**
   - UI to simulate user permissions
   - Test what a specific user can see/do

5. **Notification System**
   - Alert users when their permissions change
   - Notify admins of permission violations

---

## Testing Checklist

Before deploying to production, verify:

- [ ] Role aggregation works (All > OwnerGroupOnly > None)
- [ ] Access Disabled terminates all actions for that module
- [ ] List vs View are enforced separately
- [ ] OwnerGroupOnly correctly filters by user's groups
- [ ] Inheritance works (parent group members can access child group records)
- [ ] Non-admin cannot assign records outside their groups (when setting is false)
- [ ] System Admin can always do everything
- [ ] UI hides/shows elements based on permissions
- [ ] Cannot delete system roles
- [ ] Cannot delete groups with users
- [ ] Primary group can be toggled correctly
- [ ] Multi-role users get correct aggregated permissions

---

## Security Considerations

1. **Never Trust Client-Side Checks**
   - All permission checks must be enforced server-side (RLS or Edge Functions)
   - Client-side checks are only for UI convenience

2. **Ownership is Required**
   - Every business record MUST have an owner_security_group_id
   - Enforce this at the database level (NOT NULL constraint)

3. **Admin Bypass**
   - System Admin role should bypass all restrictions
   - But still log their actions for audit purposes

4. **Default Deny**
   - If no permission is granted, deny access
   - Better to be too restrictive than too permissive

---

## Migration Path

To migrate existing data:

1. All existing records have been assigned to "Default" security group
2. All existing users need to be assigned:
   - At least one role (e.g., System Admin temporarily)
   - At least one security group (e.g., Default)
3. Create proper security groups for your organization
4. Create appropriate roles with limited permissions
5. Reassign users to correct groups and roles
6. Reassign record ownership to correct groups
7. Remove temporary admin access

---

## Example: Adding Authorization to a Component

Here's how to add authorization checks to an existing component:

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../lib/authorization';

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    loadSitesWithPermissions();
  }, []);

  const loadSitesWithPermissions = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user context (roles, groups, etc.)
    const context = await authService.getUserAuthContext(user.id);

    // Check module access
    const hasAccess = authService.isModuleAccessEnabled(context.roles, 'sites');
    if (!hasAccess) {
      setSites([]);
      return;
    }

    // Check action permissions
    const listPerm = authService.resolvePermission(context.roles, 'sites', 'list');
    setCanCreate(authService.resolvePermission(context.roles, 'sites', 'edit') !== 'None');
    setCanEdit(authService.resolvePermission(context.roles, 'sites', 'edit') !== 'None');
    setCanDelete(authService.resolvePermission(context.roles, 'sites', 'delete') !== 'None');

    // Load sites based on permission
    let query = supabase.from('sites').select('*');

    if (listPerm === 'OwnerGroupOnly') {
      query = query.in('owner_security_group_id', context.securityGroupIds);
    } else if (listPerm === 'None' || listPerm === 'NotSet') {
      setSites([]);
      return;
    }

    const { data } = await query;
    setSites(data || []);
  };

  const handleCreate = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check permission
    if (!canCreate) {
      alert('No permission to create');
      return;
    }

    // Get user's primary group
    const { data: userGroup } = await supabase
      .from('user_security_groups')
      .select('security_group_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    // Verify user can assign to this group
    const canAssign = await authService.canAssignToGroup(user.id, userGroup.security_group_id);
    if (!canAssign) {
      alert('Cannot assign to this group');
      return;
    }

    // Create with ownership
    await supabase.from('sites').insert({
      ...formData,
      owner_security_group_id: userGroup.security_group_id,
      created_by_user_id: user.id,
    });

    await loadSitesWithPermissions();
  };

  const handleDelete = async (siteId, ownerGroupId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check permission
    const canPerformDelete = await authService.can(user.id, 'sites', 'delete', ownerGroupId);
    if (!canPerformDelete) {
      alert('No permission to delete this record');
      return;
    }

    await supabase.from('sites').delete().eq('id', siteId);
    await loadSitesWithPermissions();
  };

  return (
    <div>
      {canCreate && <button onClick={() => setShowCreate(true)}>Create</button>}
      {/* ... rest of component */}
    </div>
  );
}
```

---

## Summary

✅ **Completed:**
- Complete database schema with roles, permissions, and security groups
- Authorization service with permission resolution logic
- Three admin UI pages for managing roles, groups, and users
- Default data (System Admin role, Default group)
- Basic RLS policies
- All business tables have ownership columns

❌ **Still Needed:**
- Integrate authorization checks into all existing components
- Update all data queries to filter by ownership
- Hide/show UI elements based on permissions
- Set owner_security_group_id on new records
- Refine RLS policies for production
- Fix user listing (move to Edge Function)
- Create helper hooks for permission checks
- Comprehensive testing

The foundation is solid and scalable. The system is designed to handle new modules automatically. The remaining work is primarily integration and enforcement.
