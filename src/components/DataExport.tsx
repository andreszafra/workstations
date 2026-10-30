import { useState } from 'react';
import { Download, Database, FileJson, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TABLES = [
  'sites',
  'companies',
  'employees',
  'employee_history',
  'workstations',
  'workstation_types',
  'workstation_assets',
  'fixed_assets',
  'assignment_history',
  'maintenance_logs',
  'map_elements',
  'security_groups',
  'roles',
  'role_module_permissions',
  'user_roles',
  'user_security_groups',
  'user_preferences',
  'user_password_requirements',
  'system_config',
  'system_security_config',
] as const;

type TableName = (typeof TABLES)[number];
type Row = Record<string, unknown>;
type TableStatus = { state: 'loading' } | { state: 'done'; count: number } | { state: 'error'; message: string };

const PAGE_SIZE = 1000;

async function fetchAllRows(table: TableName): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data) break;
    rows.push(...(data as Row[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\r\n');
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([type.startsWith('text/csv') ? '\uFEFF' + content : content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export default function DataExport() {
  const [statuses, setStatuses] = useState<Partial<Record<TableName, TableStatus>>>({});
  const [exportingAll, setExportingAll] = useState(false);

  const setStatus = (table: TableName, status: TableStatus) =>
    setStatuses((prev) => ({ ...prev, [table]: status }));

  const loadTable = async (table: TableName) => {
    setStatus(table, { state: 'loading' });
    try {
      const rows = await fetchAllRows(table);
      setStatus(table, { state: 'done', count: rows.length });
      return rows;
    } catch (err) {
      setStatus(table, { state: 'error', message: err instanceof Error ? err.message : 'Error desconocido' });
      return null;
    }
  };

  const exportTableCsv = async (table: TableName) => {
    const rows = await loadTable(table);
    if (rows) downloadFile(toCsv(rows), `${table}_${stamp()}.csv`, 'text/csv;charset=utf-8');
  };

  const exportAllJson = async () => {
    setExportingAll(true);
    const result: Partial<Record<TableName, Row[]>> = {};
    for (const table of TABLES) {
      const rows = await loadTable(table);
      if (rows) result[table] = rows;
    }
    downloadFile(JSON.stringify(result, null, 2), `base_de_datos_${stamp()}.json`, 'application/json');
    setExportingAll(false);
  };

  const busy = exportingAll || Object.values(statuses).some((s) => s?.state === 'loading');

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Exportar datos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Descarga todos los registros, sin límite de filas. Solo se incluyen los datos que tu usuario tiene permiso para ver.
            </p>
          </div>
          <button
            onClick={exportAllJson}
            disabled={busy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            Descargar todo (JSON)
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {TABLES.map((table) => {
            const status = statuses[table];
            return (
              <div key={table} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{table}</p>
                  {status?.state === 'done' && (
                    <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {status.count} registros exportados
                    </p>
                  )}
                  {status?.state === 'error' && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" /> No se pudo exportar: {status.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => exportTableCsv(table)}
                  disabled={busy}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-white hover:border-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status?.state === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  CSV
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
