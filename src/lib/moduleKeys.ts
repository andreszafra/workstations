export const MODULE_KEYS = {
  dashboard: 'dashboard',
  workstations: 'workstations',
  sites: 'sites',
  employees: 'employees',
  settings: 'settings',
  workstation_types: 'workstation_types',
  map_elements: 'map_elements',
  roles: 'roles',
  security_groups: 'security_groups',
  users: 'users',
} as const;

export type ModuleKey = typeof MODULE_KEYS[keyof typeof MODULE_KEYS];
