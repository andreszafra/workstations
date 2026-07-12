import { useState } from 'react';
import { useSites, useWorkstations } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { Plus, CreditCard as Edit, Trash2, MapPin, X, Map, Info, BarChart3, Building2 } from 'lucide-react';
import SiteMap from './SiteMap';
import SiteDetailModal from './SiteDetailModal';
import SiteAnalytics from './SiteAnalytics';
import CompanyAnalytics from './CompanyAnalytics';
import { useAuthorization } from '../hooks/useAuthorization';
import { MODULE_KEYS } from '../lib/moduleKeys';
import type { Site } from '../lib/database.types';

export default function Sites() {
  const { sites, loading, refetch } = useSites();
  const { workstations: allWorkstations } = useWorkstations();
  const { permissions, loading: permissionsLoading } = useAuthorization(MODULE_KEYS.sites);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [detailSite, setDetailSite] = useState<Site | null>(null);
  const [bulkAddSite, setBulkAddSite] = useState<Site | null>(null);
  const [analyticsSite, setAnalyticsSite] = useState<Site | null>(null);
  const [showCompanyAnalytics, setShowCompanyAnalytics] = useState(false);

  const getWorkstationCount = (siteId: string) => {
    return allWorkstations.filter(ws => ws.site_id === siteId).length;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this site?')) return;
    await supabase.from('sites').delete().eq('id', id);
    refetch();
  };

  if (selectedSite) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <button onClick={() => setSelectedSite(null)} className="mb-4 px-4 py-2 border rounded-lg hover:bg-gray-50">
          ← Back to Sites
        </button>
        <SiteMap siteId={selectedSite.id} siteName={selectedSite.name} />
      </div>
    );
  }

  if (loading || permissionsLoading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  if (!permissions.canList) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
        <p className="text-gray-500">You don't have permission to view sites</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold">Sites</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCompanyAnalytics(true)} className="flex gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700">
            <Building2 className="w-5 h-5" />Estadísticas de la Compañía
          </button>
          {permissions.canEdit && (
            <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />Add Site
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map(site => (
          <div key={site.id} className="bg-white rounded-lg shadow border p-6">
            <div className="flex gap-3 mb-4">
              <div className="bg-sky-100 p-2 rounded-lg">
                <MapPin className="w-6 h-6 text-sky-600" />
              </div>
              <div className="flex-1">
                <h3
                  className="font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => setDetailSite(site)}
                >
                  {site.name}
                </h3>
                <p className="text-sm text-gray-500">{getWorkstationCount(site.id)} workstations</p>
              </div>
              <button
                onClick={() => setDetailSite(site)}
                className="p-1.5 hover:bg-sky-50 rounded-lg transition-colors"
                title="View site details"
              >
                <Info className="w-5 h-5 text-gray-400 hover:text-blue-600" />
              </button>
              <button
                onClick={() => {
                  if (confirm('You are about to create workstations in bulk. Do you want to continue?')) {
                    setBulkAddSite(site);
                  }
                }}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                title="Add workstations in bulk"
              >
                <Plus className="w-5 h-5 text-red-500 hover:text-red-600" />
              </button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              {site.address && <div><span className="text-gray-600">Address:</span><p className="font-medium">{site.address}</p></div>}
              {site.city && <div><span className="text-gray-600">City:</span><p className="font-medium">{site.city}</p></div>}
              {site.department && <div><span className="text-gray-600">Department:</span><p className="font-medium">{site.department}</p></div>}
              {site.country && <div><span className="text-gray-600">Country:</span><p className="font-medium">{site.country}</p></div>}
              {site.contact_name && <div><span className="text-gray-600">Contact:</span><p className="font-medium">{site.contact_name}</p></div>}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <button onClick={() => setSelectedSite(site)} className="flex-1 flex justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" title="View Map">
                <Map className="w-4 h-4" />
              </button>
              <button onClick={() => setAnalyticsSite(site)} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" title="Ver Estadísticas">
                <BarChart3 className="w-4 h-4" />
              </button>
              {permissions.canEdit && (
                <button onClick={() => { setEditing(site); setShowForm(true); }} className="p-2 border rounded-lg hover:bg-gray-50" title="Edit">
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {permissions.canDelete && (
                <button onClick={() => handleDelete(site.id)} className="p-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {sites.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No sites yet</h3>
        </div>
      )}

      {showForm && <SiteForm site={editing} onClose={() => { setShowForm(false); setEditing(null); refetch(); }} />}
      {detailSite && <SiteDetailModal site={detailSite} onClose={() => setDetailSite(null)} />}
      {bulkAddSite && <BulkAddWorkstationsModal site={bulkAddSite} currentCount={getWorkstationCount(bulkAddSite.id)} onClose={() => { setBulkAddSite(null); refetch(); }} />}
      {analyticsSite && <SiteAnalytics site={analyticsSite} onClose={() => setAnalyticsSite(null)} />}
      {showCompanyAnalytics && <CompanyAnalytics onClose={() => setShowCompanyAnalytics(false)} />}
    </div>
  );
}

function SiteForm({ site, onClose }: { site: Site | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: site?.name || '',
    address: site?.address || '',
    city: site?.city || '',
    department: site?.department || '',
    country: site?.country || '',
    contact_name: site?.contact_name || '',
    contact_phone: site?.contact_phone || ''
  });
  const [createWorkstations, setCreateWorkstations] = useState(false);
  const [workstationCount, setWorkstationCount] = useState(10);
  const [assetTagPrefix, setAssetTagPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createWorkstations && !assetTagPrefix.trim()) {
      alert('Please enter an asset tag prefix for the workstations');
      return;
    }

    setIsCreating(true);

    try {
      if (site) {
        const { error } = await supabase.from('sites').update(form).eq('id', site.id);
        if (error) throw error;
      } else {
        const siteData = {
          ...form,
          asset_tag_prefix: createWorkstations ? assetTagPrefix.trim() : null
        };
        console.log('Creating site with data:', siteData);
        const { data: newSite, error: siteError } = await supabase
          .from('sites')
          .insert(siteData)
          .select()
          .maybeSingle();

        console.log('Insert result:', { newSite, siteError });

        if (siteError) {
          console.error('Error creating site:', siteError);
          alert('Error creating site: ' + (siteError.message || JSON.stringify(siteError)));
          setIsCreating(false);
          return;
        }

        if (!newSite) {
          console.error('No site returned after insert. RLS may be blocking SELECT.');
          alert('The site could not be created or read back. Please check your session and try again.');
          setIsCreating(false);
          return;
        }

        if (newSite && createWorkstations && workstationCount > 0) {
          const workstations = [];
          const count = Math.min(workstationCount, 100);
          const prefix = assetTagPrefix.trim();

          for (let i = 1; i <= count; i++) {
            workstations.push({
              asset_tag: `${prefix}-${String(i).padStart(3, '0')}`,
              site_id: newSite.id,
              floor: 0,
              status: 'available',
              position_x: 100 + ((i - 1) % 10) * 130,
              position_y: 100 + Math.floor((i - 1) / 10) * 70,
              width_cm: 120,
              height_cm: 55,
              rotation: 0
            });
          }

          const { error: wsError } = await supabase.from('workstations').insert(workstations);

          if (wsError) {
            console.error('Error creating workstations:', wsError);
            alert(`Site created but error creating workstations: ${wsError.message}`);
          } else {
            console.log(`Successfully created ${count} workstations for site ${newSite.name}`);
          }
        }
      }

      onClose();
    } catch (error) {
      console.error('Error in form submission:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between">
          <h2 className="text-xl font-bold">{site ? 'Edit Site' : 'Add Site'}</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
            <input type="text" placeholder="Site Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" placeholder="Street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department/State</label>
              <input type="text" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input type="text" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Contact Name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
              <input type="tel" placeholder="Contact Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          {!site && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createWorkstations"
                  checked={createWorkstations}
                  onChange={(e) => setCreateWorkstations(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="createWorkstations" className="text-sm font-medium text-gray-700">
                  Create workstations automatically
                </label>
              </div>

              {createWorkstations && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag Prefix *</label>
                    <input
                      type="text"
                      placeholder="e.g., BOG, NYC, LON"
                      value={assetTagPrefix}
                      onChange={(e) => setAssetTagPrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border rounded-lg"
                      maxLength={10}
                    />
                    <p className="text-xs text-gray-500 mt-1">This prefix will be used for all workstation asset tags (e.g., BOG-001)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of workstations</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={workstationCount}
                      onChange={(e) => setWorkstationCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Workstations will be arranged in a grid on the ground floor</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isCreating} className="px-4 py-2 border rounded-lg disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isCreating} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {isCreating ? 'Creating...' : (site ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkAddWorkstationsModal({ site, currentCount, onClose }: { site: Site; currentCount: number; onClose: () => void }) {
  const [workstationCount, setWorkstationCount] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [newPrefix, setNewPrefix] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const prefixToUse = site.asset_tag_prefix || newPrefix.trim();

    if (!prefixToUse) {
      alert('Please enter an asset tag prefix.');
      return;
    }

    setIsCreating(true);

    try {
      if (!site.asset_tag_prefix && newPrefix.trim()) {
        const { error: updateError } = await supabase
          .from('sites')
          .update({ asset_tag_prefix: newPrefix.trim() })
          .eq('id', site.id);

        if (updateError) {
          console.error('Error updating site prefix:', updateError);
          alert(`Error updating site prefix: ${updateError.message}`);
          setIsCreating(false);
          return;
        }
      }

      const { data: existingWorkstations } = await supabase
        .from('workstations')
        .select('asset_tag')
        .eq('site_id', site.id)
        .ilike('asset_tag', `${prefixToUse}-%`);

      const existingNumbers = (existingWorkstations || [])
        .map(ws => {
          const match = ws.asset_tag.match(/-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const startNumber = maxNumber + 1;

      const workstations = [];
      const count = Math.min(workstationCount, 100);

      for (let i = 0; i < count; i++) {
        workstations.push({
          asset_tag: `${prefixToUse}-${String(startNumber + i).padStart(3, '0')}`,
          site_id: site.id,
          floor: 0,
          status: 'available',
          position_x: 100 + ((startNumber + i - 1) % 10) * 130,
          position_y: 100 + Math.floor((startNumber + i - 1) / 10) * 70,
          width_cm: 120,
          height_cm: 55,
          rotation: 0
        });
      }

      const { error } = await supabase.from('workstations').insert(workstations);

      if (error) {
        console.error('Error creating workstations:', error);
        alert(`Error creating workstations: ${error.message}`);
      } else {
        alert(`Successfully created ${count} workstations`);
        onClose();
      }
    } catch (error) {
      console.error('Error in bulk creation:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between">
          <h2 className="text-xl font-bold">Add Workstations in Bulk</h2>
          <button onClick={onClose}><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">{site.name}</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><span className="font-medium">Current workstations:</span> {currentCount}</p>
              <p><span className="font-medium">Asset tag prefix:</span> {site.asset_tag_prefix || 'Not configured'}</p>
            </div>
          </div>

          {!site.asset_tag_prefix && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                This site does not have an asset tag prefix configured. Please enter one to continue.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag Prefix *</label>
                <input
                  type="text"
                  placeholder="e.g., BOG, NYC, LON"
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border rounded-lg"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This prefix will be saved and used for all workstation asset tags (e.g., BOG-001)</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of workstations to add</label>
            <input
              type="number"
              min="1"
              max="100"
              value={workstationCount}
              onChange={(e) => setWorkstationCount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">New workstations will be arranged in a grid on the ground floor</p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isCreating} className="px-4 py-2 border rounded-lg disabled:opacity-50">Cancel</button>
            <button
              type="submit"
              disabled={isCreating || (!site.asset_tag_prefix && !newPrefix.trim())}
              className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 hover:bg-red-700"
            >
              {isCreating ? 'Creating...' : 'Add Workstations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
