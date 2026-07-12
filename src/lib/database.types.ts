export interface Database {
  public: {
    Tables: {
      sites: { Row: Site };
      employees: { Row: Employee };
      workstations: { Row: Workstation };
      maintenance_logs: { Row: MaintenanceLog };
      assignment_history: { Row: AssignmentHistory };
    };
  };
}

export interface Site {
  id: string;
  name: string;
  address: string;
  city: string | null;
  department: string | null;
  country: string | null;
  contact_name: string;
  contact_phone: string;
  asset_tag_prefix: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  city: string | null;
  area: string | null;
  id_type: string;
  id_number: string | null;
  site_id: string | null;
  phone: string;
  status: string;
  gender: string | null;
  user_id: string | null;
  created_at: string;
}

export interface WorkstationType {
  id: string;
  name: string;
  width_cm: number;
  height_cm: number;
  description: string | null;
  is_administrative: boolean;
  created_at: string;
}

export interface Workstation {
  id: string;
  site_id: string | null;
  assigned_to: string | null;
  status: string;
  asset_tag: string | null;
  workstation_type_id: string | null;
  position_x: number;
  position_y: number;
  rotation: number;
  width_cm: number;
  height_cm: number;
  floor: number;
  unavailable_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLog {
  id: string;
  workstation_id: string;
  date: string;
  type: string;
  description: string;
  cost: number;
  performed_by: string;
  created_at: string;
}

export interface AssignmentHistory {
  id: string;
  workstation_id: string;
  employee_id: string | null;
  employee_name: string;
  assigned_at: string;
  unassigned_at: string | null;
  notes: string;
  created_at: string;
}

export interface WorkstationWithDetails extends Workstation {
  sites?: Site | null;
  employees?: Employee | null;
  workstation_types?: WorkstationType | null;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleModulePermission {
  id: string;
  role_id: string;
  module_key: string;
  access: 'Enabled' | 'Disabled';
  delete_perm: 'All' | 'OwnerGroupOnly' | 'None' | 'NotSet';
  edit_perm: 'All' | 'OwnerGroupOnly' | 'None' | 'NotSet';
  export_perm: 'All' | 'OwnerGroupOnly' | 'None' | 'NotSet';
  import_perm: 'All' | 'OwnerGroupOnly' | 'None' | 'NotSet';
  list_perm: 'All' | 'OwnerGroupOnly' | 'None' | 'NotSet';
  bulk_update_perm: 'All' | 'OwnerGroupOnly' | 'None' | 'NotSet';
  view_perm: 'All' | 'OwnerGroupOnly' | 'None' | 'NotSet';
  created_at: string;
}

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  parent_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSecurityGroup {
  user_id: string;
  security_group_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  created_at: string;
}

export interface SystemSecurityConfig {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}
