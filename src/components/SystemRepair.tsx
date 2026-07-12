import { useState } from 'react';
import { Wrench, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RepairTask {
  id: string;
  label: string;
  description: string;
  category: 'roles' | 'security' | 'users' | 'data';
}

interface RepairLog {
  timestamp: Date;
  task: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

const REPAIR_TASKS: RepairTask[] = [
  {
    id: 'orphaned_roles',
    label: 'Limpiar asignaciones de roles huérfanas',
    description: 'Elimina asignaciones de roles que apuntan a usuarios inexistentes',
    category: 'roles',
  },
  {
    id: 'orphaned_groups',
    label: 'Limpiar asignaciones de grupos huérfanas',
    description: 'Elimina asignaciones de grupos de seguridad que apuntan a usuarios inexistentes',
    category: 'security',
  },
  {
    id: 'users_without_roles',
    label: 'Detectar usuarios sin roles',
    description: 'Identifica usuarios que no tienen ningún rol asignado',
    category: 'users',
  },
  {
    id: 'users_without_groups',
    label: 'Detectar usuarios sin grupos',
    description: 'Identifica usuarios que no tienen ningún grupo de seguridad asignado',
    category: 'users',
  },
  {
    id: 'duplicate_role_assignments',
    label: 'Eliminar asignaciones duplicadas de roles',
    description: 'Elimina asignaciones duplicadas de roles para el mismo usuario',
    category: 'roles',
  },
  {
    id: 'duplicate_group_assignments',
    label: 'Eliminar asignaciones duplicadas de grupos',
    description: 'Elimina asignaciones duplicadas de grupos para el mismo usuario',
    category: 'security',
  },
  {
    id: 'orphaned_employees',
    label: 'Limpiar vinculaciones de empleados huérfanas',
    description: 'Corrige empleados vinculados a usuarios que ya no existen',
    category: 'data',
  },
  {
    id: 'fix_primary_groups',
    label: 'Reparar grupos primarios',
    description: 'Asegura que cada usuario tenga exactamente un grupo primario',
    category: 'security',
  },
];

export default function SystemRepair() {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [logs, setLogs] = useState<RepairLog[]>([]);

  const toggleTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const selectAll = () => {
    setSelectedTasks(REPAIR_TASKS.map((t) => t.id));
  };

  const deselectAll = () => {
    setSelectedTasks([]);
  };

  const addLog = (task: string, status: 'success' | 'error' | 'warning', message: string) => {
    setLogs((prev) => [
      {
        timestamp: new Date(),
        task,
        status,
        message,
      },
      ...prev,
    ]);
  };

  const executeRepair = async () => {
    if (selectedTasks.length === 0) return;

    setIsRunning(true);
    setProgress(0);
    setLogs([]);

    const totalTasks = selectedTasks.length;
    let completedTasks = 0;

    for (const taskId of selectedTasks) {
      const task = REPAIR_TASKS.find((t) => t.id === taskId);
      if (!task) continue;

      setCurrentTask(task.label);

      try {
        await executeTask(taskId, task);
        completedTasks++;
        setProgress((completedTasks / totalTasks) * 100);
      } catch (error: any) {
        addLog(task.label, 'error', `Error: ${error.message}`);
        completedTasks++;
        setProgress((completedTasks / totalTasks) * 100);
      }
    }

    setCurrentTask('');
    setIsRunning(false);
    addLog('Sistema', 'success', 'Proceso de reparación completado');
  };

  const executeTask = async (taskId: string, task: RepairTask) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    switch (taskId) {
      case 'orphaned_roles':
        await repairOrphanedRoles(task);
        break;
      case 'orphaned_groups':
        await repairOrphanedGroups(task);
        break;
      case 'users_without_roles':
        await detectUsersWithoutRoles(task);
        break;
      case 'users_without_groups':
        await detectUsersWithoutGroups(task);
        break;
      case 'duplicate_role_assignments':
        await removeDuplicateRoleAssignments(task);
        break;
      case 'duplicate_group_assignments':
        await removeDuplicateGroupAssignments(task);
        break;
      case 'orphaned_employees':
        await repairOrphanedEmployees(task);
        break;
      case 'fix_primary_groups':
        await fixPrimaryGroups(task);
        break;
      default:
        addLog(task.label, 'warning', 'Tarea no implementada');
    }
  };

  const getAllUsers = async () => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('No se pudo obtener la lista de usuarios');
    }

    const { users } = await response.json();
    return users.map((u: any) => u.id);
  };

  const repairOrphanedRoles = async (task: RepairTask) => {
    const userIds = await getAllUsers();

    const { data: roleAssignments } = await supabase
      .from('user_roles')
      .select('user_id, role_id');

    if (!roleAssignments) {
      addLog(task.label, 'error', 'No se pudo obtener asignaciones de roles');
      return;
    }

    const orphaned = roleAssignments.filter((ra) => !userIds.includes(ra.user_id));

    if (orphaned.length === 0) {
      addLog(task.label, 'success', 'No se encontraron asignaciones huérfanas');
      return;
    }

    for (const orphan of orphaned) {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', orphan.user_id)
        .eq('role_id', orphan.role_id);
    }

    addLog(task.label, 'success', `Se eliminaron ${orphaned.length} asignaciones huérfanas`);
  };

  const repairOrphanedGroups = async (task: RepairTask) => {
    const userIds = await getAllUsers();

    const { data: groupAssignments } = await supabase
      .from('user_security_groups')
      .select('user_id, security_group_id');

    if (!groupAssignments) {
      addLog(task.label, 'error', 'No se pudo obtener asignaciones de grupos');
      return;
    }

    const orphaned = groupAssignments.filter((ga) => !userIds.includes(ga.user_id));

    if (orphaned.length === 0) {
      addLog(task.label, 'success', 'No se encontraron asignaciones huérfanas');
      return;
    }

    for (const orphan of orphaned) {
      await supabase
        .from('user_security_groups')
        .delete()
        .eq('user_id', orphan.user_id)
        .eq('security_group_id', orphan.security_group_id);
    }

    addLog(task.label, 'success', `Se eliminaron ${orphaned.length} asignaciones huérfanas`);
  };

  const detectUsersWithoutRoles = async (task: RepairTask) => {
    const userIds = await getAllUsers();

    const { data: roleAssignments } = await supabase.from('user_roles').select('user_id');

    const usersWithRoles = new Set(roleAssignments?.map((ra) => ra.user_id) || []);
    const usersWithoutRoles = userIds.filter((uid) => !usersWithRoles.has(uid));

    if (usersWithoutRoles.length === 0) {
      addLog(task.label, 'success', 'Todos los usuarios tienen roles asignados');
      return;
    }

    addLog(
      task.label,
      'warning',
      `Se encontraron ${usersWithoutRoles.length} usuarios sin roles`
    );
  };

  const detectUsersWithoutGroups = async (task: RepairTask) => {
    const userIds = await getAllUsers();

    const { data: groupAssignments } = await supabase
      .from('user_security_groups')
      .select('user_id');

    const usersWithGroups = new Set(groupAssignments?.map((ga) => ga.user_id) || []);
    const usersWithoutGroups = userIds.filter((uid) => !usersWithGroups.has(uid));

    if (usersWithoutGroups.length === 0) {
      addLog(task.label, 'success', 'Todos los usuarios tienen grupos asignados');
      return;
    }

    addLog(
      task.label,
      'warning',
      `Se encontraron ${usersWithoutGroups.length} usuarios sin grupos`
    );
  };

  const removeDuplicateRoleAssignments = async (task: RepairTask) => {
    const { data: roleAssignments } = await supabase
      .from('user_roles')
      .select('id, user_id, role_id');

    if (!roleAssignments) {
      addLog(task.label, 'error', 'No se pudo obtener asignaciones de roles');
      return;
    }

    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const assignment of roleAssignments) {
      const key = `${assignment.user_id}-${assignment.role_id}`;
      if (seen.has(key)) {
        duplicates.push(assignment.id);
      } else {
        seen.set(key, assignment.id);
      }
    }

    if (duplicates.length === 0) {
      addLog(task.label, 'success', 'No se encontraron asignaciones duplicadas');
      return;
    }

    for (const dupId of duplicates) {
      await supabase.from('user_roles').delete().eq('id', dupId);
    }

    addLog(task.label, 'success', `Se eliminaron ${duplicates.length} asignaciones duplicadas`);
  };

  const removeDuplicateGroupAssignments = async (task: RepairTask) => {
    const { data: groupAssignments } = await supabase
      .from('user_security_groups')
      .select('id, user_id, security_group_id');

    if (!groupAssignments) {
      addLog(task.label, 'error', 'No se pudo obtener asignaciones de grupos');
      return;
    }

    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const assignment of groupAssignments) {
      const key = `${assignment.user_id}-${assignment.security_group_id}`;
      if (seen.has(key)) {
        duplicates.push(assignment.id);
      } else {
        seen.set(key, assignment.id);
      }
    }

    if (duplicates.length === 0) {
      addLog(task.label, 'success', 'No se encontraron asignaciones duplicadas');
      return;
    }

    for (const dupId of duplicates) {
      await supabase.from('user_security_groups').delete().eq('id', dupId);
    }

    addLog(task.label, 'success', `Se eliminaron ${duplicates.length} asignaciones duplicadas`);
  };

  const repairOrphanedEmployees = async (task: RepairTask) => {
    const userIds = await getAllUsers();
    const userIdsSet = new Set(userIds);

    const { data: employees } = await supabase
      .from('employees')
      .select('id, user_id, name')
      .not('user_id', 'is', null);

    if (!employees) {
      addLog(task.label, 'error', 'No se pudo obtener empleados');
      return;
    }

    const orphanedEmployees = employees.filter(
      (emp) => emp.user_id && !userIdsSet.has(emp.user_id)
    );

    if (orphanedEmployees.length === 0) {
      addLog(task.label, 'success', 'No se encontraron empleados con vinculaciones huérfanas');
      return;
    }

    for (const emp of orphanedEmployees) {
      await supabase.from('employees').update({ user_id: null }).eq('id', emp.id);
    }

    addLog(
      task.label,
      'success',
      `Se corrigieron ${orphanedEmployees.length} vinculaciones huérfanas`
    );
  };

  const fixPrimaryGroups = async (task: RepairTask) => {
    const userIds = await getAllUsers();

    let fixedCount = 0;

    for (const userId of userIds) {
      const { data: userGroups } = await supabase
        .from('user_security_groups')
        .select('security_group_id, is_primary')
        .eq('user_id', userId);

      if (!userGroups || userGroups.length === 0) continue;

      const primaryGroups = userGroups.filter((g) => g.is_primary);

      if (primaryGroups.length === 0) {
        await supabase
          .from('user_security_groups')
          .update({ is_primary: true })
          .eq('user_id', userId)
          .eq('security_group_id', userGroups[0].security_group_id);
        fixedCount++;
      } else if (primaryGroups.length > 1) {
        await supabase
          .from('user_security_groups')
          .update({ is_primary: false })
          .eq('user_id', userId);

        await supabase
          .from('user_security_groups')
          .update({ is_primary: true })
          .eq('user_id', userId)
          .eq('security_group_id', primaryGroups[0].security_group_id);
        fixedCount++;
      }
    }

    if (fixedCount === 0) {
      addLog(task.label, 'success', 'Todos los grupos primarios están correctos');
    } else {
      addLog(task.label, 'success', `Se corrigieron ${fixedCount} grupos primarios`);
    }
  };

  const categories = Array.from(new Set(REPAIR_TASKS.map((t) => t.category)));

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reparación del Sistema</h2>
            <p className="text-sm text-gray-600">
              Detecta y repara problemas en roles, grupos de seguridad y relaciones
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Tareas de Reparación ({selectedTasks.length} seleccionadas)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm px-3 py-1 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  Seleccionar Todas
                </button>
                <button
                  onClick={deselectAll}
                  className="text-sm px-3 py-1 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Deseleccionar Todas
                </button>
              </div>
            </div>

            {categories.map((category) => {
              const categoryTasks = REPAIR_TASKS.filter((t) => t.category === category);
              const categoryLabels: Record<string, string> = {
                roles: 'Roles',
                security: 'Grupos de Seguridad',
                users: 'Usuarios',
                data: 'Datos',
              };

              return (
                <div key={category} className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    {categoryLabels[category]}
                  </h4>
                  <div className="space-y-2">
                    {categoryTasks.map((task) => (
                      <label
                        key={task.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedTasks.includes(task.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => toggleTask(task.id)}
                          disabled={isRunning}
                          className="mt-1 w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{task.label}</p>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
              <button
                onClick={executeRepair}
                disabled={isRunning || selectedTasks.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Ejecutando Reparación...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5" />
                    Ejecutar Reparación ({selectedTasks.length} tareas)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="w-1/2 bg-gray-50 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso y Resultados</h3>

            {isRunning && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{currentTask}</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Registro de Actividad</h4>
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      log.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : log.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : log.status === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{log.task}</p>
                        <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {log.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isRunning && logs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Wrench className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Selecciona las tareas de reparación y haz clic en "Ejecutar Reparación"</p>
                <p className="text-sm mt-2">Los resultados aparecerán aquí</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
