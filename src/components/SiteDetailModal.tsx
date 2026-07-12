import { useState, useEffect } from 'react';
import { X, MapPin, Phone, User, Building2, Globe, Users, Monitor, Share2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import WorkstationDetail from './WorkstationDetail';
import type { Site, WorkstationWithDetails } from '../lib/database.types';

interface Props {
  site: Site;
  onClose: () => void;
}

export default function SiteDetailModal({ site, onClose }: Props) {
  const [showTeam, setShowTeam] = useState(false);
  const [workstations, setWorkstations] = useState<WorkstationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkstation, setSelectedWorkstation] = useState<WorkstationWithDetails | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (showTeam) {
      loadWorkstations();
    }
  }, [showTeam, site.id]);

  const loadWorkstations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('workstations')
      .select(`
        *,
        sites(name, city),
        employees(id, name, email),
        workstation_types(name)
      `)
      .eq('site_id', site.id)
      .order('asset_tag');
    if (data) setWorkstations(data as WorkstationWithDetails[]);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'assigned': return 'bg-blue-500';
      case 'maintenance': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'unavailable': return 'bg-gray-500';
      case 'out_of_service': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const handleShareSite = () => {
    const shareUrl = `${window.location.origin}?readonly=true&site=${site.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (selectedWorkstation) {
    return <WorkstationDetail workstation={selectedWorkstation} onClose={() => setSelectedWorkstation(null)} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl">
        <div className="border-b px-6 py-4 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">{site.name}</h2>
            <p className="text-blue-100 text-sm mt-1">Site Details</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 rounded-lg p-2 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {!showTeam ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Site ID</p>
                      <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded border border-gray-200 break-all">
                        {site.id}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Use this ID for CSV imports with site:id format</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Address</p>
                      <p className="font-medium">{site.address || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">City / Department</p>
                      <p className="font-medium">
                        {site.city || 'Not specified'}
                        {site.department && `, ${site.department}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Globe className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Country</p>
                      <p className="font-medium">{site.country || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <User className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Contact Person</p>
                      <p className="font-medium">{site.contact_name || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <Phone className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Contact Phone</p>
                      <p className="font-medium">{site.contact_phone || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Quick Tip:</strong> When importing employees via CSV, use the Site ID shown above in the format <code className="bg-blue-100 px-2 py-1 rounded">site_id</code> column to assign employees to this site.
                </p>
              </div>
            </>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members ({workstations.length} workstations)
              </h3>

              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading team...</div>
              ) : workstations.length === 0 ? (
                <div className="text-center py-12">
                  <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No workstations found for this site</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workstations.map(ws => (
                    <div key={ws.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(ws.status)}`} title={ws.status}></div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => setSelectedWorkstation(ws)}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                            >
                              {ws.asset_tag || 'No Tag'}
                            </button>
                            {ws.workstation_types && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{ws.workstation_types.name}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            {ws.employees ? (
                              <>
                                <User className="w-4 h-4 text-gray-400" />
                                <button
                                  onClick={() => {
                                    const employeeDetail = document.createElement('div');
                                    employeeDetail.innerHTML = `
                                      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                                        <div class="bg-white rounded-lg p-6 max-w-md w-full">
                                          <h3 class="text-lg font-bold mb-4">${ws.employees.name}</h3>
                                          <p class="text-sm text-gray-600 mb-2"><strong>Email:</strong> ${ws.employees.email || '-'}</p>
                                          <p class="text-sm text-gray-600 mb-4"><strong>Workstation:</strong> ${ws.asset_tag || '-'}</p>
                                          <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Close</button>
                                        </div>
                                      </div>
                                    `;
                                    document.body.appendChild(employeeDetail);
                                  }}
                                  className="text-gray-700 hover:text-blue-600 hover:underline"
                                >
                                  {ws.employees.name}
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-400 text-sm">Unassigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-between bg-gray-50 rounded-b-lg">
          <div className="flex gap-2">
            <button
              onClick={() => setShowTeam(!showTeam)}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {showTeam ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              {showTeam ? 'View Details' : 'View Team'}
            </button>
            <button
              onClick={handleShareSite}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              {copied ? 'Link Copied!' : 'Share Site'}
            </button>
          </div>
          <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
