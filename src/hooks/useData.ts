import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Site, Employee, Workstation, MaintenanceLog, WorkstationWithDetails, AssignmentHistory, WorkstationType } from '../lib/database.types';

export interface FixedAsset {
  id: string;
  name: string;
  category: string;
  description: string | null;
  created_at: string;
}

export interface MapElement {
  id: string;
  site_id: string;
  type: 'box' | 'label' | 'icon';
  floor?: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  label: string;
  image_url: string;
  border_width: number;
  border_color: string;
  has_shadow: boolean;
  created_at: string;
}

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = async () => {
    setLoading(true);
    const { data } = await supabase.from('sites').select('*').order('name');
    if (data) setSites(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  return { sites, loading, refetch: fetchSites };
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').order('name');
    if (data) setEmployees(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return { employees, loading, refetch: fetchEmployees };
}

export function useWorkstations(siteId?: string) {
  const [workstations, setWorkstations] = useState<WorkstationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkstations = async () => {
    setLoading(true);
    let query = supabase.from('workstations').select('*, sites(*), employees(*), workstation_types(*)').order('created_at', { ascending: false });
    if (siteId) query = query.eq('site_id', siteId);
    const { data } = await query;
    if (data) setWorkstations(data as WorkstationWithDetails[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkstations();
  }, [siteId]);

  return { workstations, loading, refetch: fetchWorkstations };
}

export function useMaintenanceLogs(workstationId?: string) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from('maintenance_logs').select('*').order('date', { ascending: false });
    if (workstationId) query = query.eq('workstation_id', workstationId);
    const { data } = await query;
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [workstationId]);

  return { logs, loading, refetch: fetchLogs };
}

export function useAssignmentHistory(workstationId?: string) {
  const [history, setHistory] = useState<AssignmentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    let query = supabase.from('assignment_history').select('*').order('assigned_at', { ascending: false });
    if (workstationId) query = query.eq('workstation_id', workstationId);
    const { data } = await query;
    if (data) setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [workstationId]);

  return { history, loading, refetch: fetchHistory };
}

export function useMapElements(siteId?: string) {
  const [elements, setElements] = useState<MapElement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchElements = async () => {
    if (!siteId) {
      setElements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('map_elements').select('*').eq('site_id', siteId).order('created_at');
    if (data) setElements(data as MapElement[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchElements();
  }, [siteId]);

  return { elements, loading, refetch: fetchElements };
}

export function useWorkstationTypes() {
  const [types, setTypes] = useState<WorkstationType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = async () => {
    setLoading(true);
    const { data } = await supabase.from('workstation_types').select('*').order('name');
    if (data) setTypes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  return { types, loading, refetch: fetchTypes };
}

export function useFixedAssets() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = async () => {
    setLoading(true);
    const { data } = await supabase.from('fixed_assets').select('*').order('name');
    if (data) setAssets(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return { assets, loading, refetch: fetchAssets };
}
